from sqlalchemy import Column, String, ForeignKey, Date, Boolean, INTEGER
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.orm import relationship
from database.core import Base
from entities.Users import User

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(UUID(as_uuid=True), ForeignKey(User.id), primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    gender = Column(String)
    DOB = Column(Date)
    phoneNo = Column(String, nullable=False)
    YOE = Column(INTEGER,nullable=False)
    specialization = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    certificate_number = Column(String, nullable=True)
    
    # user = relationship("Users",back_populates="doctor")
    # facility = relationship("FacilityMaster",back_populates="doctor", cascade="all, delete-orphan")
