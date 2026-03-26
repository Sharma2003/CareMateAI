import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database.core import Base


class Drug(Base):
    """Centralized drug database for medicine search."""
    __tablename__ = "drugs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=True, index=True)
    brand_name = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True, index=True)  # antibiotic, analgesic, etc.
    drug_class = Column(String(100), nullable=True)
    common_dosages = Column(String(500), nullable=True)  # e.g. "500mg, 250mg"
    route = Column(String(100), nullable=True)  # oral, IV, topical
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    usage_count = Column(Integer, default=0)  # for "most popular" ordering
    source = Column(String(50), default='manual', nullable=False)  # rxnorm, manual, import
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
