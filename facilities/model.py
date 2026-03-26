from pydantic import BaseModel, Field
from uuid import UUID
from typing import Annotated, Literal, Optional

FacilityType = Literal[
    "clinics",
    "hospital",
    "diagnostic_center",
    "pathology_lab",
    "radiology_center",
    "pharmacy",
    "nursing_home",
    "rehabilitation_center",
    "telemedicine",
    "polyclinic",
    "eye_care_center",
    "dental_clinic",
    "physiotherapy_center",
    "maternity_center",
    "blood_bank",
    "other",
]


class FacilitiesDetails(BaseModel):
    facilityName: Annotated[str, Field(min_length=2, max_length=60)]
    facilityType: FacilityType
    facilityAddress: Annotated[str, Field(min_length=10, max_length=100)]
    city: Annotated[str, Field(min_length=2, max_length=40)]
    state: Annotated[str, Field(min_length=2, max_length=40)]
    postalCode: int
    contactNumber: Optional[str] = None
    website: Optional[str] = None
    registrationNumber: Optional[str] = None
    operatingHours: Optional[str] = None


class FacilityResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    facilityName: Annotated[str, Field(min_length=2, max_length=60)]
    facilityType: FacilityType
    facilityAddress: Annotated[str, Field(min_length=10, max_length=100)]
    city: Annotated[str, Field(min_length=2, max_length=40)]
    state: Annotated[str, Field(min_length=2, max_length=40)]
    postalCode: int
    contactNumber: Optional[str] = None
    website: Optional[str] = None
    registrationNumber: Optional[str] = None
    operatingHours: Optional[str] = None

    model_config = {"from_attributes": True}
