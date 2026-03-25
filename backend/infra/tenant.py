from contextvars import ContextVar, Token

_current_gym_id: ContextVar[str | None] = ContextVar("current_gym_id", default=None)


def set_tenant(gym_id: str) -> Token[str | None]:
    return _current_gym_id.set(gym_id)


def get_tenant() -> str:
    gym_id = _current_gym_id.get()
    if gym_id is None:
        raise RuntimeError("Tenant context not set. Call set_tenant() first.")
    return gym_id


def clear_tenant(token: Token[str | None]) -> None:
    _current_gym_id.reset(token)
