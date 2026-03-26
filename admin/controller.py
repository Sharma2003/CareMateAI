from fastapi import APIRouter, HTTPException
from database.core import DbSession
from auth.service import CurrentUser
from entities.Users import User
from entities.Doctor import Doctor
from entities.Patients import Patient
from entities.Booking import Booking
from entities.Prescription import Prescription
from sqlalchemy import func, text, cast, String
from typing import Optional
from uuid import UUID as _UUID
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def ensure_admin(current_user_id, db):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not found in database")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail=f"Admin access required. Your role: {user.role}")
    return user


def _count_by_status(db, status_str: str) -> int:
    """Count bookings by status using raw text cast — bypasses SQLAlchemy Enum issues."""
    result = db.execute(
        text("SELECT COUNT(*) FROM bookings WHERE status::text = :s"),
        {"s": status_str}
    ).scalar()
    return int(result or 0)


@router.get("/dashboard")
def get_dashboard_stats(db: DbSession, current_user: CurrentUser):
    try:
        ensure_admin(current_user.get_uuid(), db)

        total_doctors       = db.query(func.count(Doctor.id)).scalar() or 0
        total_patients      = db.query(func.count(Patient.id)).scalar() or 0
        total_bookings      = db.query(func.count(Booking.id)).scalar() or 0
        total_users         = db.query(func.count(User.id)).scalar() or 0
        total_prescriptions = db.query(func.count(Prescription.id)).scalar() or 0

        # Use raw SQL cast to avoid SQLAlchemy Enum name vs value mismatch
        completed   = _count_by_status(db, "completed")
        in_progress = _count_by_status(db, "in_progress")
        booked      = _count_by_status(db, "booked")
        cancelled   = _count_by_status(db, "cancelled")

        # Recent bookings
        recent_bookings = (
            db.query(Booking)
            .order_by(Booking.created_at.desc())
            .limit(10)
            .all()
        )

        recent_list = []
        for b in recent_bookings:
            try:
                p = db.query(Patient).filter(Patient.id == b.patient_id).first()
                d = db.query(Doctor).filter(Doctor.id == b.doctor_id).first()
                recent_list.append({
                    "id":       str(b.id),
                    "patient":  f"{p.first_name} {p.last_name}" if p else "Unknown",
                    "doctor":   f"Dr. {d.first_name} {d.last_name}" if d else "Unknown",
                    "status":   str(b.status.value) if hasattr(b.status, 'value') else str(b.status),
                    "start_ts": b.start_ts.isoformat() if b.start_ts else None,
                })
            except Exception as e:
                logger.warning(f"Skipping booking {getattr(b,'id','?')}: {e}")
                continue

        # Doctors
        doctors_list = []
        for d in db.query(Doctor).all():
            try:
                u = db.query(User).filter(User.id == d.id).first()
                doctors_list.append({
                    "id":             str(d.id),
                    "name":           f"Dr. {d.first_name} {d.last_name}",
                    "specialization": d.specialization or "General",
                    "username":       u.userid if u else "",
                    "email":          u.email  if u else "",
                })
            except Exception as e:
                logger.warning(f"Skipping doctor {getattr(d,'id','?')}: {e}")
                continue

        # Patients
        patients_list = []
        for p in db.query(Patient).all():
            try:
                u = db.query(User).filter(User.id == p.id).first()
                patients_list.append({
                    "id":       str(p.id),
                    "name":     f"{p.first_name} {p.last_name}",
                    "username": u.userid if u else "",
                    "email":    u.email  if u else "",
                    "phone":    p.phoneNo or "",
                })
            except Exception as e:
                logger.warning(f"Skipping patient {getattr(p,'id','?')}: {e}")
                continue

        return {
            "stats": {
                "total_doctors":           total_doctors,
                "total_patients":          total_patients,
                "total_bookings":          total_bookings,
                "completed_consultations": completed,
                "in_progress":             in_progress,
                "upcoming":                booked,
                "cancelled":               cancelled,
                "total_prescriptions":     total_prescriptions,
                "total_users":             total_users,
            },
            "recent_bookings": recent_list,
            "doctors":         doctors_list,
            "patients":        patients_list,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin dashboard error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")


@router.get("/patient/{patient_id}")
def get_patient_profile_admin(patient_id: str, db: DbSession, current_user: CurrentUser):
    ensure_admin(current_user.get_uuid(), db)
    try:
        pid = _UUID(patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    p = db.query(Patient).filter(Patient.id == pid).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    u = db.query(User).filter(User.id == pid).first()

    bookings = (
        db.query(Booking)
        .filter(Booking.patient_id == pid)
        .order_by(Booking.created_at.desc())
        .all()
    )
    booking_list = []
    for b in bookings:
        d = db.query(Doctor).filter(Doctor.id == b.doctor_id).first()
        booking_list.append({
            "id":       str(b.id),
            "doctor":   f"Dr. {d.first_name} {d.last_name}" if d else "Unknown",
            "start_ts": b.start_ts.isoformat() if b.start_ts else None,
            "status":   str(b.status.value) if hasattr(b.status, 'value') else str(b.status),
        })

    return {
        "id":                str(p.id),
        "first_name":        p.first_name,
        "last_name":         p.last_name,
        "username":          u.userid if u else "",
        "email":             u.email  if u else "",
        "phone":             p.phoneNo or "",
        "gender":            p.gender or "",
        "dob":               str(p.DOB) if p.DOB else None,
        "blood_group":       p.bloodGroup or "",
        "marital_status":    p.maritalStatus or "",
        "emergency_contact": p.emergencyContactName or "",
        "emergency_phone":   p.emergencyContactPhone or "",
        "bookings":          booking_list,
    }
