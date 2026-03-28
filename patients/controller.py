from fastapi import APIRouter
from database.core import DbSession
from auth.service import CurrentUser
from patients.model import PatientDetails, PatientProfileResponse, PatientDetailsUpdated
from patients.service import get_patient_profile, upsert_patient_profile, update_patient_profile
from helper.ensure import ensure_patient_role

router = APIRouter(
    prefix="/patient",
    tags=["patient"],
)


@router.get("/profile", response_model=PatientProfileResponse)
def get_my_profile(current_user: CurrentUser, db: DbSession):
    ensure_patient_role(current_user=current_user.get_uuid(), db=db)
    return get_patient_profile(current_user.get_uuid(), db)


@router.post("/profile", response_model=PatientProfileResponse)
def create_profile(
    payload: PatientDetails, current_user: CurrentUser, db: DbSession
):
    ensure_patient_role(current_user=current_user.get_uuid(), db=db)
    return upsert_patient_profile(
        user_id=current_user.get_uuid(), data=payload, db=db
    )


@router.patch("/profile", response_model=PatientProfileResponse)
def update_profile(
    current_user: CurrentUser, db: DbSession, payload: PatientDetailsUpdated
):
    ensure_patient_role(current_user=current_user.get_uuid(), db=db)
    return update_patient_profile(
        user_id=current_user.get_uuid(), db=db, data=payload
    )