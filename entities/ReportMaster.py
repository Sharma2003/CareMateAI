import uuid 
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.core import Base

class ReportMaster(Base):
    __tablename__ = "report_master"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), nullable=False)
    booking_id = Column(UUID(as_uuid=True), nullable=False)

    job_status = Column(String, nullable=False, default="processing")

    created_at = Column(DateTime(timezone=True),server_default=func.now())
    
    patient_report = relationship(
        "PatientReport",
        back_populates="master",
        uselist=False,
        cascade='all, delete-orphan'
        )
    
    doctor_report = relationship(
        "DoctorReport",
        back_populates='master',
        uselist=False,
        cascade='all, delete-orphan'
        )
    