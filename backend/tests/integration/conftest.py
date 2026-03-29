"""Integration test fixtures — real database, auth bypass via dependency override."""

import os
import pathlib

import pytest
from fastapi import Header
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# Database URL — dedicated test DB (churndb_test)
# ---------------------------------------------------------------------------
_DEFAULT_DB_URL = "postgresql://churn:churn123@localhost:5432/churndb_test"
_TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", _DEFAULT_DB_URL)
_ADMIN_DB_URL = _TEST_DB_URL.rsplit("/", 1)[0] + "/postgres"

_MIGRATIONS_DIR = pathlib.Path(__file__).resolve().parents[2] / "migrations"

# Tables that carry gym_id and are subject to RLS.
_TENANT_TABLES = [
    "notifications",
    "actions_log",
    "churn_scores",
    "member_features",
    "checkins",
    "payments",
    "members",
    "subscriptions",
    "invoices",
    "coupon_usage",
]

_ALL_TABLES = [*_TENANT_TABLES, "gyms"]

# Token → org_id mapping for the auth override.
_TOKEN_ORG_MAP: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Session-scoped: create test DB + run migrations once
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def integration_engine():
    """Create churndb_test, apply migrations, force RLS, and yield engine."""
    admin_engine = create_engine(_ADMIN_DB_URL, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(text(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = 'churndb_test' AND pid <> pg_backend_pid()"
        ))
        conn.execute(text("DROP DATABASE IF EXISTS churndb_test"))
        conn.execute(text("CREATE DATABASE churndb_test"))
    admin_engine.dispose()

    engine = create_engine(_TEST_DB_URL)

    with engine.begin() as conn:
        for migration_file in sorted(_MIGRATIONS_DIR.glob("*.sql")):
            sql = migration_file.read_text()
            conn.execute(text(sql))

        for table in _TENANT_TABLES:
            conn.execute(text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))

    yield engine
    engine.dispose()


# ---------------------------------------------------------------------------
# Session-scoped: monkey-patch SessionLocal + install auth override once
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _patch_session_local(integration_engine):
    """Replace infra.database.SessionLocal and install the auth override."""
    import api.deps as deps_mod
    import infra.database as db_mod
    from api.deps import get_current_gym_id
    from api.main import app

    test_session_local = sessionmaker(
        autocommit=False, autoflush=False, bind=integration_engine
    )
    db_mod.SessionLocal = test_session_local
    deps_mod.SessionLocal = test_session_local

    # Single override that routes by token value.
    def _fake_get_current_gym_id(authorization: str | None = Header(None)) -> str:
        if not authorization or not authorization.startswith("Bearer "):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header",
            )
        token = authorization.removeprefix("Bearer ").strip()
        org_id = _TOKEN_ORG_MAP.get(token)
        if org_id is None:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unknown test token: {token}",
            )
        return org_id

    app.dependency_overrides[get_current_gym_id] = _fake_get_current_gym_id

    yield

    app.dependency_overrides.pop(get_current_gym_id, None)


# ---------------------------------------------------------------------------
# Function-scoped: truncate all tenant tables before each test
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _clean_tables(integration_engine):
    """Truncate all data tables before each test for a clean slate."""
    with integration_engine.begin() as conn:
        tables_csv = ", ".join(_ALL_TABLES)
        conn.execute(text(f"TRUNCATE {tables_csv} CASCADE"))
    yield


# ---------------------------------------------------------------------------
# Client factory — registers a token → org mapping and returns TestClient
# ---------------------------------------------------------------------------
@pytest.fixture()
def make_client():
    """Factory: make_client(clerk_org_id) -> TestClient + auth headers."""
    from api.main import app

    tokens: list[str] = []

    def _factory(clerk_org_id: str = "org_test_default") -> tuple[TestClient, dict]:
        token = f"test-token-{clerk_org_id}"
        _TOKEN_ORG_MAP[token] = clerk_org_id
        tokens.append(token)
        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}
        return client, headers

    yield _factory

    for t in tokens:
        _TOKEN_ORG_MAP.pop(t, None)


@pytest.fixture()
def client_a(make_client) -> tuple[TestClient, dict]:
    """Pre-made (TestClient, headers) for gym A."""
    return make_client("org_test_gym_a")


@pytest.fixture()
def client_b(make_client) -> tuple[TestClient, dict]:
    """Pre-made (TestClient, headers) for gym B."""
    return make_client("org_test_gym_b")


@pytest.fixture()
def auth_headers():
    """Default auth headers (for single-tenant tests using client_a/client_b tuples)."""
    return {"Authorization": "Bearer test-token-org_test_gym_a"}


# ---------------------------------------------------------------------------
# Helper: get gym UUID after auto-provisioning
# ---------------------------------------------------------------------------
def _get_gym_uuid(client: TestClient, headers: dict, clerk_org_id: str) -> str:
    """Trigger auto-provisioning and return the internal UUID."""
    resp = client.get("/members", headers=headers)
    assert resp.status_code == 200
    from infra.database import SessionLocal
    db = SessionLocal()
    try:
        row = db.execute(
            text("SELECT id::text FROM gyms WHERE clerk_org_id = :org_id"),
            {"org_id": clerk_org_id},
        ).fetchone()
        assert row is not None, f"Gym not provisioned for {clerk_org_id}"
        return row.id
    finally:
        db.close()


@pytest.fixture()
def gym_a_uuid(client_a):
    """Trigger auto-provisioning for gym A and return its internal UUID."""
    client, headers = client_a
    return _get_gym_uuid(client, headers, "org_test_gym_a")


@pytest.fixture()
def gym_b_uuid(client_b):
    """Trigger auto-provisioning for gym B and return its internal UUID."""
    client, headers = client_b
    return _get_gym_uuid(client, headers, "org_test_gym_b")
