from sqlalchemy import Column, DateTime, UUID, Enum, ForeignKey, UniqueConstraint, CheckConstraint, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.core import Base
from entities.Patients import Patient
from entities.Doctor import Doctor
from entities.FacilityMaster import Facility
import uuid
import enum


class BookingStatus(str, enum.Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    IN_PROGRESS = "in_progress"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(
        UUID(as_uuid=True), ForeignKey(Doctor.id, ondelete="RESTRICT"), nullable=False
    )
    patient_id = Column(
        UUID(as_uuid=True), ForeignKey(Patient.id, ondelete="RESTRICT"), nullable=False
    )
    facility_id = Column(
        UUID(as_uuid=True), ForeignKey(Facility.id, ondelete="RESTRICT"), nullable=False
    )
    start_ts = Column(DateTime(timezone=True), nullable=False)
    end_ts = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.BOOKED)

    # Consultation actual timing
    consultation_start_ts = Column(DateTime(timezone=True), nullable=True)
    consultation_end_ts = Column(DateTime(timezone=True), nullable=True)
    consultation_duration_minutes = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    session = relationship(
        "ConsultationSession", back_populates="booking", uselist=False
    )

    # report_master = relationship("ReportMaster", 
    #             back_populates="booking"
    # )
    __table_args__ = (
        UniqueConstraint(
            "doctor_id", "start_ts",
            name="uq_doctor_start_time",
        ),
        CheckConstraint(
            "end_ts > start_ts",
            name="check_booking_time_valid",
        ),
    )

