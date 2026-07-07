"""Route decorators.

``auth_required`` is a pass-through stub so generated apps run out of the box
while preserving the authentication convention. Replace its body with real
authentication (JWT/session/Clerk) when wiring auth for production.
"""
from functools import wraps


def auth_required(func):
    """Authentication gate (stub — currently a pass-through)."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper
