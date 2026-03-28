from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID, uuid4
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from passlib.context import CryptContext
import jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import logging
import os

from entities.Users import User
from auth.model import RegisterUserRequest, Token, TokenData
from database.core import DbSession

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTE = 30

oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")
bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return bcrypt_context.hash(password)


def authenticate_user(userid: str, password: str, db: Session) -> User | bool:
    user = db.query(User).filter(User.userid == userid).first()
    if not user or not verify_password(password, user.password_hash):
        logging.warning(f"Failed authentication attempt for username: {userid}")
        return False
    return user


def create_access_token(userid: str, id: UUID, expires_delta: timedelta) -> str:
    encode = {
        "sub": userid,
        "id": str(id),
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, [ALGORITHM])
        id: str | None = payload.get("id")
        username: str | None = payload.get("sub")
        if id is None or username is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return TokenData(user_id=id, user_name=username)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def registered_user(db: Session, register_user_request: RegisterUserRequest) -> None:
    # Check if user already exists by username OR email (both must be unique)
    existing_username = db.query(User).filter(User.userid == register_user_request.userid).first()
    if existing_username:
        raise HTTPException(status_code=409, detail="Username already taken. Please choose a different username.")

    existing_email = db.query(User).filter(User.email == register_user_request.email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already registered. Please use a different email or login.")

    create_user_model = User(
        id=uuid4(),
        userid=register_user_request.userid,
        email=register_user_request.email,
        role=register_user_request.role,
        password_hash=get_password_hash(register_user_request.password.get_secret_value()),
    )

    db.add(create_user_model)
    db.commit()


def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]) -> TokenData:
    return verify_token(token)


CurrentUser = Annotated[TokenData, Depends(get_current_user)]


def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession
) -> Token:
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(
        user.userid, user.id, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTE)
    )
    return Token(access_token=token, token_type="bearer")
