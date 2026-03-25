from infra.database import SessionLocal, engine


class TestEngine:
    def test_engine_is_created(self):
        assert engine is not None
        assert str(engine.url).startswith("postgresql")

    def test_session_local_is_callable(self):
        assert SessionLocal is not None
        assert callable(SessionLocal)
