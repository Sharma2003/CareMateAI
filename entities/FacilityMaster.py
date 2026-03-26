<<<<<<< HEAD
from sqlalchemy import Column, String,Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

# from entities.Users import User
from entities.Doctor import Doctor
# from entities.Patients import Patient
=======
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
>>>>>>> 561e94f (MVP version 1)
from database.core import Base
import uuid


class Facility(Base):
    __tablename__ = "facility"

<<<<<<< HEAD
    id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True),ForeignKey(Doctor.id))
    facilityName = Column(String,  nullable=False)
=======
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"))
    facilityName = Column(String, nullable=False)
>>>>>>> 561e94f (MVP version 1)
    facilityType = Column(String, nullable=False)
    facilityAddress = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    postalCode = Column(Integer, nullable=False)
<<<<<<< HEAD

    # doctors = relationship(
    #         "DoctorFacility",
    #         back_populates="facility",
    #         cascade="all, delete"
    #     )

=======
    contactNumber = Column(String, nullable=True)
    website = Column(String, nullable=True)
    registrationNumber = Column(String, nullable=True)
    operatingHours = Column(String, nullable=True)
>>>>>>> 561e94f (MVP version 1)
