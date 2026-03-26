<<<<<<< HEAD
from sqlalchemy import Column, DateTime, UUID,Enum,ForeignKey, String, UniqueConstraint, TIME, CheckConstraint
=======
from sqlalchemy import Column, DateTime, UUID, Enum, ForeignKey, UniqueConstraint, CheckConstraint, Integer
>>>>>>> 561e94f (MVP version 1)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.core import Base
from entities.Patients import Patient
from entities.Doctor import Doctor
from entities.FacilityMaster import Facility
import uuid
import enum

<<<<<<< HEAD
=======

>>>>>>> 561e94f (MVP version 1)
class BookingStatus(str, enum.Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
<<<<<<< HEAD
=======
    IN_PROGRESS = "in_progress"
>>>>>>> 561e94f (MVP version 1)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
<<<<<<< HEAD
    doctor_id = Column(UUID(as_uuid=True), ForeignKey(Doctor.id,  ondelete="RESTRICT"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey(Patient.id,  ondelete="RESTRICT"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey(Facility.id,  ondelete="RESTRICT"), nullable=False)
    start_ts = Column(DateTime(timezone=True), nullable=False)
    end_ts = Column(DateTime(timezone=True),nullable=False)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.BOOKED)

=======
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

>>>>>>> 561e94f (MVP version 1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
<<<<<<< HEAD
        onupdate=func.now()
    )
    
    session = relationship("ConsultationSession",back_populates="booking",uselist=False)

    __table_args__ = (
        UniqueConstraint(
            "doctor_id",
            "start_ts",
            name="uq_doctor_start_time"
        ),
    )
    
    __table_args__ = (
        CheckConstraint(
        "end_ts > start_ts",
        name="check_booking_time_valid"
        ),
    )
=======
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

>>>>>>> 561e94f (MVP version 1)
