from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException
<<<<<<< HEAD
from users.model import *
from entities.Users import User
from auth.service import verify_password, get_password_hash
from database.core import *
import logging 
from users.model import UserResponse

def get_user_by_id(user_id : UUID, db : Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"User ID Not found: {user_id}")
        raise HTTPException(status_code=404, detail="User Not Found")
    return UserResponse.model_validate(user, from_attributes=True)

def changePassword(user_id: UUID, password_change: PasswordChange, db : Session) -> dict:
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logging.warning(f"User ID not Found : {user_id}")
        if not verify_password(plain_password=password_change.current_password, hashed_password=user.password_hash):
            logging.warning(f"Incorrect Password")
            raise HTTPException(status_code=404, detail="Incorrect password")
        if password_change.new_password != password_change.new_password_confirm:
            logging.warning(f"Password did not Match")
            raise HTTPException(detail="password do not match")
        user.password_hash = get_password_hash(password_change.new_password)
        db.commit()
        return {"message" : "Password Updated"}
    except Exception as e:
        raise e         
=======
import logging

from entities.Users import User
from auth.service import verify_password, get_password_hash
from users.model import UserResponse, PasswordChange


def get_user_by_id(user_id: UUID, db: Session) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"User ID not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user, from_attributes=True)


def changePassword(user_id: UUID, password_change: PasswordChange, db: Session) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"User ID not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(
        plain_password=password_change.current_password,
        hashed_password=user.password_hash,
    ):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    if password_change.new_password != password_change.new_password_confirm:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    user.password_hash = get_password_hash(password_change.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
>>>>>>> 561e94f (MVP version 1)
