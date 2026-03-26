from uuid import UUID
from fastapi import HTTPException


def authorize_user_access(current_user: str, user_name: str):
    """Verify that the authenticated user matches the requested resource owner."""
    if current_user != user_name:
        raise HTTPException(
            status_code=403, detail="You are not authorized to access this user"
        )
