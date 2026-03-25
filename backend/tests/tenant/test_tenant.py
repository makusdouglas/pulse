import uuid

import pytest

from infra.tenant import clear_tenant, get_tenant, set_tenant


class TestSetAndGetTenant:
    def test_set_and_get(self):
        gym_id = str(uuid.uuid4())
        token = set_tenant(gym_id)
        try:
            assert get_tenant() == gym_id
        finally:
            clear_tenant(token)

    def test_raises_when_not_set(self):
        with pytest.raises(RuntimeError, match="Tenant context not set"):
            get_tenant()


class TestClearTenant:
    def test_restores_previous(self):
        gym_a = str(uuid.uuid4())
        gym_b = str(uuid.uuid4())

        token_a = set_tenant(gym_a)
        try:
            token_b = set_tenant(gym_b)
            assert get_tenant() == gym_b

            clear_tenant(token_b)
            assert get_tenant() == gym_a
        finally:
            clear_tenant(token_a)

    def test_back_to_none(self):
        gym_id = str(uuid.uuid4())
        token = set_tenant(gym_id)
        clear_tenant(token)

        with pytest.raises(RuntimeError):
            get_tenant()
