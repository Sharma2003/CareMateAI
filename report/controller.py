from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from database.core import DbSession
from auth.service import CurrentUser
from helper.ensure import ensure_patient_role, ensure_doctor_role
from report.service import get_patient_report, get_doctor_report, search_patients_for_doctor, get_patient_reports_for_doctor


router = APIRouter(
    prefix="/report",
    tags=["report"]
)


@router.get("/patient-report")
def get_report(db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    return get_patient_report(db=db, patient_id=current_user.get_uuid())


@router.get("/doctor-report")
def get_doctor_report_all(db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return get_doctor_report(db=db, doctor_id=current_user.get_uuid())


@router.get("/doctor/search-patients")
def search_patients(
    db: DbSession,
    current_user: CurrentUser,
    q: Optional[str] = Query(None, description="Search by patient name, ID, or phone number"),
):
    """Search patients who have reports, by name / patient_id / phone."""
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return search_patients_for_doctor(db=db, doctor_id=current_user.get_uuid(), query=q or "")


@router.get("/doctor/patient-reports/{patient_id}")
def get_patient_all_reports(
    patient_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    """Get all reports for a specific patient (doctor view)."""
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    return get_patient_reports_for_doctor(db=db, doctor_id=current_user.get_uuid(), patient_id=patient_id)

