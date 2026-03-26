import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database.core import Base
import enum


class DocumentOwnerType(str, enum.Enum):
    doctor = "doctor"
    patient = "patient"


class DocumentCategory(str, enum.Enum):
    # Doctor docs
    degree = "degree"
    certificate = "certificate"
    license = "license"
    other_doctor = "other_doctor"
    # Patient docs
    lab_report = "lab_report"
    imaging = "imaging"
    prescription = "prescription"
    discharge_summary = "discharge_summary"
    other_patient = "other_patient"
    # Referral uploaded by patient
    referral_test = "referral_test"


class DocumentStore(Base):
    """Stores uploaded documents for both doctors and patients."""
    __tablename__ = "document_store"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)          # doctor.id or patient.id
    owner_type = Column(Enum(DocumentOwnerType), nullable=False)
    category = Column(Enum(DocumentCategory), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)      # relative path on disk
    mime_type = Column(String(100), nullable=True)
    file_size_bytes = Column(String(20), nullable=True)
    # If related to a referral / prescription
    prescription_id = Column(UUID(as_uuid=True), ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
