from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from entities.Prescription import Prescription
from entities.Booking import Booking
from prescriptions.model import PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse


def create_prescription(db: Session, payload: PrescriptionCreate, doctor_id: UUID) -> PrescriptionResponse:
    booking = db.query(Booking).filter(Booking.id == payload.booking_id, Booking.doctor_id == doctor_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not yours")

    # Check if prescription already exists for this booking
    existing = db.query(Prescription).filter(Prescription.booking_id == payload.booking_id).first()
    if existing:
        # Update instead
        for k, v in payload.model_dump(exclude_unset=True, exclude={"booking_id"}).items():
            if v is not None:
                # Serialize medicine/lab lists to plain dicts
                if isinstance(v, list):
                    v = [item.model_dump() if hasattr(item, "model_dump") else item for item in v]
                setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return PrescriptionResponse.model_validate(existing)

    medicines_data = [m.model_dump() for m in (payload.medicines or [])]
    labs_data = [l.model_dump() for l in (payload.lab_tests or [])]

    rx = Prescription(
        booking_id=payload.booking_id,
        doctor_id=doctor_id,
        patient_id=booking.patient_id,
        doctor_notes=payload.doctor_notes,
        diagnosis=payload.diagnosis,
        medicines=medicines_data,
        referral_to_specialist=payload.referral_to_specialist,
        referral_notes=payload.referral_notes,
        referral_doctor_name=payload.referral_doctor_name,
        lab_tests=labs_data,
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)
    return PrescriptionResponse.model_validate(rx)


def get_prescription_by_booking(db: Session, booking_id: UUID) -> PrescriptionResponse:
    rx = db.query(Prescription).filter(Prescription.booking_id == booking_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="No prescription found for this booking")
    return PrescriptionResponse.model_validate(rx)


def get_prescriptions_for_patient(db: Session, patient_id: UUID):
    rxs = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()
    return [PrescriptionResponse.model_validate(r) for r in rxs]


def get_prescriptions_for_doctor(db: Session, doctor_id: UUID):
    rxs = db.query(Prescription).filter(Prescription.doctor_id == doctor_id).order_by(Prescription.created_at.desc()).all()
    return [PrescriptionResponse.model_validate(r) for r in rxs]
