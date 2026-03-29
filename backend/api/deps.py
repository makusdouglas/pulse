from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.auth import decode_clerk_jwt, extract_gym_id
from infra.database import SessionLocal


def get_current_gym_id(authorization: str | None = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_clerk_jwt(token)
    return extract_gym_id(payload)


def get_db(
    gym_id: str = Depends(get_current_gym_id),
) -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        db.execute(text("SET LOCAL app.current_gym_id = :gym_id"), {"gym_id": gym_id})
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
