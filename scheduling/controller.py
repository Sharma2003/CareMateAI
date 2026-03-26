<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from entities.Users import User
from database.core import DbSession
from auth.service import CurrentUser
from scheduling.model import doctorAvailability, doctorAvailabilityResponse
from scheduling.service import create_Doctor_Scheule, get_Doctor_Availability, update_Doctor_Availability, delete_Doctor_Availability
from helper.ensure import ensure_doctor_role, ensure_doctor_facility, ensure_doctor_username

=======
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
>>>>>>> 561e94f (MVP version 1)
from uuid import UUID

router = APIRouter(
    prefix="/schedule",
<<<<<<< HEAD
    tags=["schedule"]
)

@router.post("/",response_model=doctorAvailabilityResponse)
def create(payload:doctorAvailability, db : DbSession, facility_id : UUID, current_user : CurrentUser):
    ensure_doctor_role(current_user=current_user.get_uuid(), db = db)
    # ensure_doctor_username(db=db , username=current_user.user_id)
    return create_Doctor_Scheule(db=db,doctor_id=current_user.get_uuid(),facility_id=facility_id,payload=payload)
 
@router.get("/")
def get_Availability(db:DbSession, current_user:CurrentUser):
    ensure_doctor_role(current_user=current_user.get_uuid(), db = db)
    # ensure_doctor_username(db=db , username=current_user.user_id)
    return get_Doctor_Availability(db=db,doctor_id=current_user.get_uuid())

@router.put("/{facility_id}",response_model=doctorAvailabilityResponse)
def update_Availability(db:DbSession,facility_id : UUID,current_user : CurrentUser ,payload: doctorAvailability):
    ensure_doctor_role(current_user=current_user.get_uuid(), db = db)
    ensure_doctor_facility(db=db, facility_id=facility_id)
    return update_Doctor_Availability(db=db, facility_id=facility_id, payload=payload)

@router.delete("/delete_Doctor_Availability")
def delete_Availability(db:DbSession,Scheduling_id : UUID, current_user : CurrentUser, facility_id : UUID):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    ensure_doctor_facility(db=db, facility_id=facility_id)
    return delete_Doctor_Availability(db=db, Scheduling_id=Scheduling_id)
=======
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
>>>>>>> 561e94f (MVP version 1)
