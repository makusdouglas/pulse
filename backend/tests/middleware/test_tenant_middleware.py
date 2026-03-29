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


class TestTenantMiddlewarePassthrough:
    def test_non_public_path_passes_through(self, client):
        """Middleware no longer manages tenant — just passes through."""
        from api.main import app

        test_client = TestClient(app)
        # Without auth header, route-level dependency will reject (not middleware)
        response = test_client.get("/dashboard/stats")
        assert response.status_code == 401
