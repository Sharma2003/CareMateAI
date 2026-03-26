<<<<<<< HEAD
from pydantic import BaseModel, EmailStr, Field
=======
from pydantic import BaseModel, Field
>>>>>>> 561e94f (MVP version 1)
from uuid import UUID
from datetime import date
from typing import Annotated, Optional, Literal

<<<<<<< HEAD
class DoctorDetails(BaseModel):
    first_name : Annotated[str,Field(min_length=1,max_length=20)]
    last_name : Annotated[str,Field(min_length=1, max_length=20)]
    gender : Optional[Literal['male','female','others']]
    DOB : date
    phoneNo : str
    YOE : int

class DoctorProfileResponse(DoctorDetails):
    id : UUID
    email : EmailStr
    userid : str

=======

class DoctorProfileDetails(BaseModel):
    first_name: Annotated[str, Field(min_length=1, max_length=20)]
    last_name: Annotated[str, Field(min_length=1, max_length=20)]
    gender: Optional[Literal["male", "female", "others"]]
    DOB: date
    phoneNo: str
    YOE: int
    specialization: Optional[str] = None
    degree: Optional[str] = None
    certificate_number: Optional[str] = None


class DoctorProfileResponse(BaseModel):
    id: UUID
    first_name: Annotated[str, Field(min_length=1, max_length=20)]
    last_name: Annotated[str, Field(min_length=1, max_length=20)]
    gender: Optional[Literal["male", "female", "others"]]
    DOB: date
    phoneNo: str
    YOE: int
    specialization: Optional[str] = None
    degree: Optional[str] = None
    certificate_number: Optional[str] = None

    model_config = {"from_attributes": True}


class DoctorProfileUpdate(BaseModel):
    first_name: Annotated[str, Field(min_length=1, max_length=20)] | None = None
    last_name: Annotated[str, Field(min_length=1, max_length=20)] | None = None
    gender: Optional[Literal["male", "female", "others"]] | None = None
    DOB: date | None = None
    phoneNo: str | None = None
    YOE: int | None = None
    specialization: str | None = None
    degree: str | None = None
    certificate_number: str | None = None
>>>>>>> 561e94f (MVP version 1)
