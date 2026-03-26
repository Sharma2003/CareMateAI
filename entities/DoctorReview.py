from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database.core import Base
from entities.Booking import Booking
from entities.Doctor import Doctor
from entities.Patients import Patient
import uuid


class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey(Booking.id, ondelete="CASCADE"), unique=True, nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey(Doctor.id, ondelete="CASCADE"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey(Patient.id, ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
