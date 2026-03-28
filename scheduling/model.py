from pydantic import BaseModel, field_validator, model_validator
from uuid import UUID
from datetime import time


class DoctorAvailabilityCreate(BaseModel):
    """Schema for creating a new doctor availability schedule."""
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    is_active: bool = True

    @field_validator("day_of_week")
    @classmethod
    def validate_day_of_week(cls, v):
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be between 0 (Monday) and 6 (Sunday)")
        return v

    @field_validator("slot_duration_minutes")
    @classmethod
    def validate_slot_duration(cls, v):
        if v < 5 or v > 120:
            raise ValueError("slot_duration_minutes must be between 5 and 120")
        return v

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            parts = v.split(":")
            h, m = int(parts[0]), int(parts[1])
            return time(h, m)
        return v

    @model_validator(mode="after")
    def validate_clinic_hours(self):
        if self.start_time < time(6, 0):
            raise ValueError("start_time cannot be before 06:00")
        if self.start_time > time(23, 0):
            raise ValueError("start_time cannot be after 23:00")
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after the start_time")
        return self


class DoctorAvailabilityUpdate(BaseModel):
    """Schema for updating an existing doctor availability schedule."""
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    is_active: bool

    @field_validator("day_of_week")
    @classmethod
    def validate_day_of_week(cls, v):
        if v < 0 or v > 6:
            raise ValueError("day_of_week must be between 0 (Monday) and 6 (Sunday)")
        return v

    @field_validator("slot_duration_minutes")
    @classmethod
    def validate_slot_duration(cls, v):
        if v < 5 or v > 120:
            raise ValueError("slot_duration_minutes must be between 5 and 120")
        return v

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            parts = v.split(":")
            h, m = int(parts[0]), int(parts[1])
            return time(h, m)
        return v

    @model_validator(mode="after")
    def validate_clinic_hours(self):
        if self.start_time < time(6, 0):
            raise ValueError("start_time cannot be before 06:00")
        if self.start_time > time(23, 0):
            raise ValueError("start_time cannot be after 23:00")
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after the start_time")
        return self


class DoctorAvailabilityResponse(BaseModel):
    """Response schema for doctor availability."""
    id: UUID
    facility_id: UUID
    doctor_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int
    is_active: bool

    class Config:
        from_attributes = True