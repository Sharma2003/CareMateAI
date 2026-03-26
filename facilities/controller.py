from fastapi import APIRouter
from uuid import UUID

from database.core import DbSession
from facilities.service import (
    create_doctor_facility,
    get_facilities_for_doctor,
    update_facility,
    delete_facility
)
from facilities.model import FacilitiesDetails, FacilityResponse
from auth.service import CurrentUser
from helper.ensure import ensure_doctor_role


router = APIRouter(
    prefix="/providers",
    tags=["provider"]
)


@router.post("/", response_model=FacilityResponse)
def create_facility(payload: FacilitiesDetails, current_user: CurrentUser, db: DbSession):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return create_doctor_facility(db=db, payload=payload, doctor_id=current_user.get_uuid())


@router.get("/", response_model=list[FacilityResponse])
def list_facilities(current_user: CurrentUser, db: DbSession):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return get_facilities_for_doctor(db=db, doctor_id=current_user.get_uuid())


@router.put("/{facility_id}", response_model=FacilityResponse)
def update_existing_facility(
    facility_id: UUID,
    payload: FacilitiesDetails,
    current_user: CurrentUser,
    db: DbSession
):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return update_facility(db=db, facility_id=facility_id, payload=payload)


@router.delete("/{facility_id}")
def delete_existing_facility(facility_id: UUID, current_user: CurrentUser, db: DbSession):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return delete_facility(db=db, facility_id=facility_id)
