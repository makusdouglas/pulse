"""Ensure tasks modules are reimported fresh for each test session."""

import sys

import pytest


@pytest.fixture(autouse=True)
def _clear_tasks_module_cache():
    """Remove cached task modules so patches take effect."""
    for key in list(sys.modules.keys()):
        if key.startswith("tasks.feature_job") or key.startswith("tasks.scoring_job"):
            del sys.modules[key]
