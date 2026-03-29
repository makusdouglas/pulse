import uuid

import pytest

from infra.tenant import clear_tenant, get_tenant, set_tenant


class TestSetAndGetTenant:
    def test_set_and_get(self):
        gym_id = str(uuid.uuid4())
        set_tenant(gym_id)
        try:
            assert get_tenant() == gym_id
        finally:
            clear_tenant()

    def test_raises_when_not_set(self):
        clear_tenant()
        with pytest.raises(RuntimeError, match="Tenant context not set"):
            get_tenant()


class TestClearTenant:
    def test_clears_to_none(self):
        gym_id = str(uuid.uuid4())
        set_tenant(gym_id)
        assert get_tenant() == gym_id

        clear_tenant()

        with pytest.raises(RuntimeError):
            get_tenant()

    def test_overwrite_and_clear(self):
        gym_a = str(uuid.uuid4())
        gym_b = str(uuid.uuid4())

        set_tenant(gym_a)
        assert get_tenant() == gym_a

        set_tenant(gym_b)
        assert get_tenant() == gym_b

        clear_tenant()
        with pytest.raises(RuntimeError):
            get_tenant()
