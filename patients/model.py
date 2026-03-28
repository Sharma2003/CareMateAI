from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date
from typing import Annotated, Literal, Optional


class PatientDetails(BaseModel):
    first_name: Annotated[str, Field(min_length=1, max_length=20)]
    last_name: Annotated[str, Field(min_length=1, max_length=20)]
    gender: Optional[Literal["male", "female", "others"]] = None
    DOB: date
    phoneNo: str
    bloodGroup: str
    maritalStatus: Literal["married", "unmarried"]
    emergencyContactName: Annotated[str, Field(min_length=1, max_length=50)]
    emergencyContactPhone: str


class PatientDetailsUpdated(BaseModel):
    first_name: Annotated[str, Field(min_length=1, max_length=20)] | None = None
    last_name: Annotated[str, Field(min_length=1, max_length=20)] | None = None
    gender: Optional[Literal["male", "female", "others"]] | None = None
    DOB: date | None = None
    phoneNo: str | None = None
    bloodGroup: str | None = None
    maritalStatus: Literal["married", "unmarried"] | None = None
    emergencyContactName: Annotated[str, Field(min_length=1, max_length=50)] | None = None
    emergencyContactPhone: str | None = None


class PatientProfileResponse(BaseModel):
    id: UUID
    first_name: Annotated[str, Field(min_length=1, max_length=20)]
    last_name: Annotated[str, Field(min_length=1, max_length=20)]
    gender: Optional[Literal["male", "female", "others"]] = None
    DOB: date
    phoneNo: str
    bloodGroup: str
    maritalStatus: Literal["married", "unmarried"]
    emergencyContactName: Annotated[str, Field(min_length=1, max_length=50)]
    emergencyContactPhone: str

    model_config = {"from_attributes": True}
