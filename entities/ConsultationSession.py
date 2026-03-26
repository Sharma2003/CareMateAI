import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.core import Base
import enum
from sqlalchemy import Enum


class SessionType(str, enum.Enum):
    consultation = "consultation"
    follow_up = "follow_up"

class SessionStatus(str, enum.Enum):
    ongoing = 'ongoing'
    completed = 'completed'
    cancelled = 'cancelled'
<<<<<<< HEAD
    now_show = 'now_show'
=======
    no_show = 'no_show'
>>>>>>> 561e94f (MVP version 1)


class ConsultationSession(Base):
    __tablename__ = 'consultation_session'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id",ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True
    )
    session_type = Column(Enum(SessionType), nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.ongoing,nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True))

    booking = relationship("Booking",back_populates="session")
    notes = relationship("ConsultationNotes",back_populates="session", cascade="all, delete-orphan")
    # reports = relationship("PatientReport",back_populates="session")