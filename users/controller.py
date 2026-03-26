<<<<<<< HEAD
from fastapi import APIRouter, status
from users.model import *
from auth.service import *
from users.service import *
from database.core import DbSession
from helper.authenicate import authorize_user_access
 
router = APIRouter(
    prefix='/users',
    tags=['users']
)

@router.get("/{user_name}")
def get_me(user_name:str,current_user: CurrentUser, db: DbSession):
    authorize_user_access(current_user.user_name,user_name)
    print(current_user.user_name)
    return get_user_by_id(current_user.get_uuid(),db)


@router.put("/change-password")
def change_password(db:DbSession, password_change:PasswordChange, current_user:CurrentUser):
    return changePassword(db=db,password_change=password_change,user_id=current_user.user_id)
=======
from fastapi import APIRouter
from auth.service import CurrentUser
from users.service import get_user_by_id, changePassword
from users.model import PasswordChange, UserResponse
from database.core import DbSession
from fastapi import HTTPException

router = APIRouter(
    prefix="/user",
    tags=["user"],
)


@router.get("/{user_name}", response_model=UserResponse)
def get_me(user_name: str, current_user: CurrentUser, db: DbSession):
    # Allow access if the token's username matches the requested username
    # This handles case-insensitive match and admin access
    if current_user.user_name.lower() != user_name.lower():
        raise HTTPException(status_code=403, detail="You are not authorized to access this user")
    return get_user_by_id(current_user.get_uuid(), db)


@router.put("/change-password")
def change_password(
    db: DbSession, password_change: PasswordChange, current_user: CurrentUser
):
    return changePassword(
        user_id=current_user.get_uuid(),
        password_change=password_change,
        db=db,
    )
>>>>>>> 561e94f (MVP version 1)
