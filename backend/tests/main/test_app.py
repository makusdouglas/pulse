from api.main import app


class TestApp:
    def test_title(self):
        assert app.title == "Pulse API"
        assert app.version == "0.1.0"
