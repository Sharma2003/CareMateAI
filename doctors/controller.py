from fastapi import APIRouter
from database.core import DbSession
from auth.service import CurrentUser
from doctors.model import DoctorProfileDetails, DoctorProfileResponse, DoctorProfileUpdate
from doctors.service import get_doctor_profile, upsert_doctor_profile, update_doctor_profile
from helper.ensure import ensure_doctor_role

router = APIRouter(
    prefix="/doctor",
    tags=["doctor"],
)


@router.post("/profile", response_model=DoctorProfileResponse)
def create_profile(current_user: CurrentUser, payload: DoctorProfileDetails, db: DbSession):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return upsert_doctor_profile(current_user.get_uuid(), db=db, data=payload)


@router.patch("/profile", response_model=DoctorProfileResponse)
def update_profile(
    current_user: CurrentUser, db: DbSession, payload: DoctorProfileUpdate
):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return update_doctor_profile(user_id=current_user.get_uuid(), data=payload, db=db)


@router.get("/profile", response_model=DoctorProfileResponse)
def get_profile(current_user: CurrentUser, db: DbSession):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return get_doctor_profile(current_user.get_uuid(), db=db)
