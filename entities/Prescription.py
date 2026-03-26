import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database.core import Base


class Prescription(Base):
    """Doctor-created prescription linked to a consultation session."""
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)

    # Doctor's clinical notes / observations
    doctor_notes = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)

    # Medicines: stored as JSON list of {rxcui, name, schedule, instructions, duration}
    medicines = Column(JSON, nullable=True, default=list)

    # Referral fields
    referral_to_specialist = Column(String, nullable=True)
    referral_notes = Column(Text, nullable=True)
    referral_doctor_name = Column(String, nullable=True)

    # Lab/test requests: list of {test_name, instructions}
    lab_tests = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
