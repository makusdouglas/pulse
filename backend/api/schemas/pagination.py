"""Base pagination schema for list endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
