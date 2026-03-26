from typing import Annotated
from fastapi import APIRouter, Depends, Request
from starlette import status
<<<<<<< HEAD
from auth.model import Token, RegiserUserRequest
from auth.service import *
from fastapi.security import OAuth2PasswordRequestForm
from database.core import DbSession
from rate_limiter import limiter
 
router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

@router.post("/register",status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register_user(request: Request, db: DbSession, register_user_request:RegiserUserRequest):
    registered_user(db, register_user_request)

@router.post("/token",response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession):
    return login_for_access_token(form_data,db)
=======
from fastapi.security import OAuth2PasswordRequestForm

from auth.model import Token, RegisterUserRequest
from auth.service import registered_user, login_for_access_token
from database.core import DbSession
from rate_limiter import limiter

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register_user(
    request: Request, db: DbSession, register_user_request: RegisterUserRequest
):
    registered_user(db, register_user_request)
    return {"message": "User registered successfully"}


@router.post("/token", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: DbSession
):
    return login_for_access_token(form_data, db)
>>>>>>> 561e94f (MVP version 1)
