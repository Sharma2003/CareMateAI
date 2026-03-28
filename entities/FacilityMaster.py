from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from database.core import Base
import uuid


class Facility(Base):
    __tablename__ = "facility"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"))
    facilityName = Column(String, nullable=False)
    facilityType = Column(String, nullable=False)
    facilityAddress = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    postalCode = Column(Integer, nullable=False)
    contactNumber = Column(String, nullable=True)
    website = Column(String, nullable=True)
    registrationNumber = Column(String, nullable=True)
    operatingHours = Column(String, nullable=True)
