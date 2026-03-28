from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional


class UserResponse(BaseModel):
    id: UUID
    userid: str
    email: EmailStr
    role: str

    model_config = {"from_attributes": True}


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str
