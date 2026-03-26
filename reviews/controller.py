from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from database.core import DbSession
from auth.service import CurrentUser
from helper.ensure import ensure_patient_role, ensure_doctor_role
from entities.DoctorReview import DoctorReview
from entities.Booking import Booking, BookingStatus
from entities.Patients import Patient

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    booking_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    booking_id: UUID
    doctor_id: UUID
    patient_id: UUID
    rating: int
    comment: Optional[str]
    patient_name: Optional[str] = None

    model_config = {"from_attributes": True}


@router.post("/", response_model=ReviewResponse)
def create_review(payload: ReviewCreate, db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())

    # Check booking exists and is completed
    booking = db.query(Booking).filter(
        Booking.id == payload.booking_id,
        Booking.patient_id == current_user.get_uuid(),
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only review completed consultations")

    # Check not already reviewed
    existing = db.query(DoctorReview).filter(DoctorReview.booking_id == payload.booking_id).first()
    if existing:
        # Update existing review
        existing.rating = payload.rating
        existing.comment = payload.comment
        db.commit()
        db.refresh(existing)
        r = existing
    else:
        r = DoctorReview(
            booking_id=payload.booking_id,
            doctor_id=booking.doctor_id,
            patient_id=current_user.get_uuid(),
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(r)
        db.commit()
        db.refresh(r)

    resp = ReviewResponse.model_validate(r)
    patient = db.query(Patient).filter(Patient.id == r.patient_id).first()
    if patient:
        resp.patient_name = f"{patient.first_name} {patient.last_name}"
    return resp


@router.get("/doctor/my-reviews", response_model=list[ReviewResponse])
def get_doctor_reviews(db: DbSession, current_user: CurrentUser):
    ensure_doctor_role(db=db, current_user=current_user.get_uuid())
    reviews = db.query(DoctorReview).filter(DoctorReview.doctor_id == current_user.get_uuid()).order_by(DoctorReview.created_at.desc()).all()
    result = []
    for r in reviews:
        resp = ReviewResponse.model_validate(r)
        patient = db.query(Patient).filter(Patient.id == r.patient_id).first()
        if patient:
            resp.patient_name = f"{patient.first_name} {patient.last_name}"
        result.append(resp)
    return result


@router.get("/patient/my-reviews", response_model=list[ReviewResponse])
def get_patient_reviews(db: DbSession, current_user: CurrentUser):
    ensure_patient_role(db=db, current_user=current_user.get_uuid())
    reviews = db.query(DoctorReview).filter(DoctorReview.patient_id == current_user.get_uuid()).all()
    result = []
    for r in reviews:
        resp = ReviewResponse.model_validate(r)
        result.append(resp)
    return result


@router.get("/booking/{booking_id}", response_model=Optional[ReviewResponse])
def get_review_for_booking(booking_id: UUID, db: DbSession, current_user: CurrentUser):
    r = db.query(DoctorReview).filter(DoctorReview.booking_id == booking_id).first()
    if not r:
        return None
    resp = ReviewResponse.model_validate(r)
    patient = db.query(Patient).filter(Patient.id == r.patient_id).first()
    if patient:
        resp.patient_name = f"{patient.first_name} {patient.last_name}"
    return resp
