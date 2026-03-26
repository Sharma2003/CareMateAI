from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
import uuid
<<<<<<< HEAD
=======
from sqlalchemy.orm import relationship
>>>>>>> 561e94f (MVP version 1)
from database.core import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    userid = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)

<<<<<<< HEAD
    def __repr__(self):
        return f"<User(email='{self.email}', role = '{self.role}')>"
=======
    # patient = relationship("Patients",back_populates="user",uselist=False)
    # doctor = relationship("Doctor",back_populates="user",uselist=False)

    # def __repr__(self):
    #     return f"<User(email='{self.email}', role = '{self.role}')>"
>>>>>>> 561e94f (MVP version 1)
