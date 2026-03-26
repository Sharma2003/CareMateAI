from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class MedicineItem(BaseModel):
    rxcui: Optional[str] = None
    name: str
    dosage: Optional[str] = None   # e.g. "500mg", "10mg"
    schedule: str                  # e.g. "Morning: 1 tab Before food | Evening: 1 tab After food"
    duration: str                  # e.g. "7 days"
    instructions: Optional[str] = None


class LabTestItem(BaseModel):
    test_name: str
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    booking_id: UUID
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines: Optional[List[MedicineItem]] = []
    referral_to_specialist: Optional[str] = None
    referral_notes: Optional[str] = None
    referral_doctor_name: Optional[str] = None
    lab_tests: Optional[List[LabTestItem]] = []


class PrescriptionUpdate(BaseModel):
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines: Optional[List[MedicineItem]] = None
    referral_to_specialist: Optional[str] = None
    referral_notes: Optional[str] = None
    referral_doctor_name: Optional[str] = None
    lab_tests: Optional[List[LabTestItem]] = None


class PrescriptionResponse(BaseModel):
    id: UUID
    booking_id: UUID
    doctor_id: UUID
    patient_id: UUID
    doctor_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    medicines: Optional[List[MedicineItem]] = []
    referral_to_specialist: Optional[str] = None
    referral_notes: Optional[str] = None
    referral_doctor_name: Optional[str] = None
    lab_tests: Optional[List[LabTestItem]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Enriched fields (not in DB, populated by service)
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    facility_name: Optional[str] = None

    model_config = {"from_attributes": True}
