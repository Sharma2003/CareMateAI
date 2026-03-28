from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, SecretStr
from typing import Literal, Annotated


class RegisterUserRequest(BaseModel):
    userid: Annotated[str, Field(min_length=5, max_length=20)]
    email: EmailStr
    role: Literal["patient", "doctor", "admin"] = "patient"
    password: SecretStr


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_name: str | None = None
    user_id: str | None = None

    def get_uuid(self) -> UUID | None:
        if self.user_id:
            return UUID(self.user_id)
        return None