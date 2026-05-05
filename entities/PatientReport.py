from sqlalchemy import Column, ForeignKey, Text, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

import uuid
from database.core import Base
from entities.ReportMaster import ReportMaster

class PatientReport(Base):
    __tablename__ = "patient_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id = Column(UUID(as_uuid=True), ForeignKey("report_master.id",ondelete="RESTRICT"), nullable= False)
    report_md = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    master = relationship("ReportMaster",back_populates="patient_report")


    