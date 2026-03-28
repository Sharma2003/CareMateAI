from doctorFinder.service import list_facilities, list_doctors_by_facility, list_doctor_slots
from fastapi import APIRouter, Query
from database.core import DbSession
from uuid import UUID
from datetime import date
from typing import Optional
from helper.ensure import ensure_patient_role
from auth.service import CurrentUser

router = APIRouter(
    prefix="/doctor-finder",
    tags=["doctor-finder"],
)


@router.get("/facility")
def facility(db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    return list_facilities(db=db)


@router.get("/doctor")
def get_doctors(db: DbSession, facility_id: UUID, current_user: CurrentUser):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    return list_doctors_by_facility(db=db, facility_id=str(facility_id))


@router.get("/doctor-slots")
def get_doctor_slots(
    db: DbSession,
    doctor_id: UUID,
    current_user: CurrentUser,
    target_date: Optional[date] = Query(default=None, description="Date to view slots for (defaults to today)"),
    facility_id: Optional[UUID] = Query(default=None, description="Filter by facility"),
):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    return list_doctor_slots(
        db=db,
        doctor_id=doctor_id,
        target_date=target_date,
        facility_id=facility_id,
    )