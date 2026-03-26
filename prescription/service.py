from fastapi import HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from entities.Prescription import Prescription
from entities.Booking import Booking
from entities.Patients import Patient
from entities.Doctor import Doctor
from entities.FacilityMaster import Facility
from prescription.model import PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse


def _enrich(pres: Prescription, db: Session) -> PrescriptionResponse:
    resp = PrescriptionResponse.model_validate(pres)
    # Patient name + phone
    patient = db.query(Patient).filter(Patient.id == pres.patient_id).first()
    if patient:
        resp.patient_name = f"{patient.first_name} {patient.last_name}"
        resp.patient_phone = patient.phoneNo
    # Doctor name + specialization
    doctor = db.query(Doctor).filter(Doctor.id == pres.doctor_id).first()
    if doctor:
        resp.doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}"
        resp.doctor_specialization = doctor.specialization
    # Facility name
    booking = db.query(Booking).filter(Booking.id == pres.booking_id).first()
    if booking:
        facility = db.query(Facility).filter(Facility.id == booking.facility_id).first()
        if facility:
            resp.facility_name = facility.facilityName
    return resp


def create_or_update_prescription(
    db: Session, doctor_id: UUID, payload: PrescriptionCreate
) -> PrescriptionResponse:
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.doctor_id != doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized for this booking")

    # Upsert — one prescription per booking
    existing = db.query(Prescription).filter(Prescription.booking_id == payload.booking_id).first()
    med_list = [m.model_dump() for m in (payload.medicines or [])]
    lab_list = [t.model_dump() for t in (payload.lab_tests or [])]

    if existing:
        for field, val in payload.model_dump(exclude={"booking_id"}, exclude_none=True).items():
            if field == "medicines":
                setattr(existing, "medicines", med_list)
            elif field == "lab_tests":
                setattr(existing, "lab_tests", lab_list)
            else:
                setattr(existing, field, val)
        db.commit()
        db.refresh(existing)
        return _enrich(existing, db)

    pres = Prescription(
        booking_id=payload.booking_id,
        doctor_id=doctor_id,
        patient_id=booking.patient_id,
        doctor_notes=payload.doctor_notes,
        diagnosis=payload.diagnosis,
        medicines=med_list,
        referral_to_specialist=payload.referral_to_specialist,
        referral_notes=payload.referral_notes,
        referral_doctor_name=payload.referral_doctor_name,
        lab_tests=lab_list,
    )
    db.add(pres)
    db.commit()
    db.refresh(pres)
    return _enrich(pres, db)


def get_prescription_by_booking(db: Session, booking_id: UUID) -> PrescriptionResponse | None:
    pres = db.query(Prescription).filter(Prescription.booking_id == booking_id).first()
    if not pres:
        return None
    return _enrich(pres, db)


def get_prescriptions_for_patient(db: Session, patient_id: UUID):
    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )
    return [_enrich(p, db) for p in prescriptions]


def get_prescriptions_for_doctor(db: Session, doctor_id: UUID):
    prescriptions = (
        db.query(Prescription)
        .filter(Prescription.doctor_id == doctor_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )
    return [_enrich(p, db) for p in prescriptions]
