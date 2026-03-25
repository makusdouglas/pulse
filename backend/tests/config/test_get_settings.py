from infra.config import Settings, get_settings


class TestGetSettings:
    def test_returns_settings_instance(self):
        get_settings.cache_clear()
        result = get_settings()
        assert isinstance(result, Settings)
        get_settings.cache_clear()

    def test_is_cached(self):
        get_settings.cache_clear()
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2
        get_settings.cache_clear()
