from fastapi import APIRouter
from database.core import DbSession
from auth.service import CurrentUser
from scheduling.model import (
    DoctorAvailabilityCreate,
    DoctorAvailabilityUpdate,
    DoctorAvailabilityResponse,
)
from scheduling.service import (
    create_doctor_schedule,
    get_doctor_availability,
    update_doctor_availability,
    delete_doctor_availability,
)
from helper.ensure import ensure_doctor_role, ensure_doctor_facility
from uuid import UUID

router = APIRouter(
    prefix="/schedule",
    tags=["schedule"],
)


@router.post("/", response_model=DoctorAvailabilityResponse)
def create(
    payload: DoctorAvailabilityCreate,
    db: DbSession,
    facility_id: UUID,
    current_user: CurrentUser,
):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return create_doctor_schedule(
        db=db,
        doctor_id=current_user.get_uuid(),
        facility_id=facility_id,
        payload=payload,
    )


@router.get("/", response_model=list[DoctorAvailabilityResponse])
def get_availability(db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    return get_doctor_availability(db=db, doctor_id=current_user.get_uuid())


@router.put("/{facility_id}", response_model=DoctorAvailabilityResponse)
def update_availability(
    db: DbSession,
    facility_id: UUID,
    current_user: CurrentUser,
    payload: DoctorAvailabilityUpdate,
):
    ensure_doctor_role(current_user=current_user.get_uuid(), db=db)
    ensure_doctor_facility(db=db, facility_id=facility_id)
    return update_doctor_availability(db=db, facility_id=facility_id, payload=payload)


@router.delete("/{scheduling_id}")
def delete_availability(
    db: DbSession,
    scheduling_id: UUID,
    current_user: CurrentUser,
):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return delete_doctor_availability(
        db=db, doctor_id=current_user.get_uuid(), scheduling_id=scheduling_id
    )
