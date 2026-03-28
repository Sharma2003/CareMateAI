from pydantic import BaseModel, field_validator, model_validator
from uuid import UUID
from datetime import time, date, datetime
from typing import Optional
from entities.Booking import BookingStatus


class BookingCreate(BaseModel):
    """Schema for creating a new booking."""
    booking_date: date
    start_ts: time
    end_ts: time
    status: BookingStatus = BookingStatus.BOOKED

    @field_validator("booking_date")
    @classmethod
    def validate_booking_date(cls, v):
        today = date.today()
        if v < today:
            raise ValueError("booking_date cannot be in the past")
        return v

    @field_validator("start_ts", "end_ts", mode="before")
    @classmethod
    def parse_time(cls, v):
        if isinstance(v, str):
            parts = v.split(":")
            h, m = int(parts[0]), int(parts[1])
            s = int(parts[2]) if len(parts) > 2 else 0
            return time(h, m, s)
        return v


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
    consultation_start_ts: Optional[datetime] = None
    consultation_end_ts: Optional[datetime] = None


class BookingResponse(BaseModel):
    """Response schema for a booking."""
    id: UUID
    doctor_id: UUID
    patient_id: UUID
    facility_id: UUID
    start_ts: datetime
    end_ts: datetime
    status: BookingStatus
    patient_name: Optional[str] = None
    # Consultation timing
    consultation_start_ts: Optional[datetime] = None
    consultation_end_ts: Optional[datetime] = None
    consultation_duration_minutes: Optional[int] = None
    # Extra info
    has_prescription: Optional[bool] = None

    model_config = {"from_attributes": True}
