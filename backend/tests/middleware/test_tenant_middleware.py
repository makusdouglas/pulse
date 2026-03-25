from unittest.mock import patch as _patch

from fastapi.testclient import TestClient


class TestTenantMiddlewarePublicPaths:
    def test_health_skips_middleware(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_docs_skips_middleware(self, client):
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_skips_middleware(self, client):
        response = client.get("/openapi.json")
        assert response.status_code == 200


class TestTenantMiddlewareAuth:
    def test_sets_tenant_for_authenticated_request(
        self, mock_decode_clerk_jwt, gym_id, auth_headers
    ):
        from api.main import app

        tenant_values = []

        def tracking_set_tenant(gid):
            from infra.tenant import set_tenant as real_set

            tenant_values.append(gid)
            return real_set(gid)

        with _patch("api.middleware.set_tenant", side_effect=tracking_set_tenant):
            test_client = TestClient(app)
            test_client.get("/some-protected-path", headers=auth_headers)

        assert len(tenant_values) == 1
        assert tenant_values[0] == gym_id

    def test_no_auth_header_passes_through(self, mock_decode_clerk_jwt):
        from api.main import app

        test_client = TestClient(app)
        response = test_client.get("/health")
        assert response.status_code == 200
