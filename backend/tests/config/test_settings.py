from infra.config import Settings


class TestSettingsDefaults:
    def test_default_values(self):
        s = Settings(
            _env_file=None,
            database_url="postgresql://test:test@localhost/testdb",
        )
        assert s.database_url == "postgresql://test:test@localhost/testdb"
        assert s.redis_url == "redis://localhost:6379/0"
        assert s.clerk_secret_key == ""
        assert s.clerk_jwks_url == ""
        assert s.cors_origins == "http://localhost:3000"

    def test_settings_from_env_vars(self, monkeypatch):
        monkeypatch.setenv("DATABASE_URL", "postgresql://env:env@db:5432/envdb")
        monkeypatch.setenv("REDIS_URL", "redis://redis:6379/1")
        monkeypatch.setenv("CLERK_SECRET_KEY", "sk_test_env")

        s = Settings(_env_file=None)
        assert s.database_url == "postgresql://env:env@db:5432/envdb"
        assert s.redis_url == "redis://redis:6379/1"
        assert s.clerk_secret_key == "sk_test_env"


class TestCorsOriginsList:
    def test_single_origin(self):
        s = Settings(_env_file=None, cors_origins="http://localhost:3000")
        assert s.cors_origins_list == ["http://localhost:3000"]

    def test_multiple_origins(self):
        s = Settings(
            _env_file=None,
            cors_origins="http://localhost:3000, https://app.pulse.com, http://localhost:5173",
        )
        assert s.cors_origins_list == [
            "http://localhost:3000",
            "https://app.pulse.com",
            "http://localhost:5173",
        ]

    def test_empty_string(self):
        s = Settings(_env_file=None, cors_origins="")
        assert s.cors_origins_list == []

    def test_trailing_comma(self):
        s = Settings(_env_file=None, cors_origins="http://localhost:3000,")
        assert s.cors_origins_list == ["http://localhost:3000"]
