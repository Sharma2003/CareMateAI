<<<<<<< HEAD
from scheduling.service import get_Doctor_Availability
# from auth.service import CurrentUser
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta, time

def slot_generator(db:Session, current_user : UUID):
    slots = []
    user = get_Doctor_Availability(db=db, doctor_id=current_user)
    start_time = user.start_time
    end_time = user.end_time
    duration = user.slot_duration_minutes
    base_date = datetime.today().date()

    current_start = datetime.combine(base_date, start_time)
    end_datetime = datetime.combine(base_date, end_time)
    # print("start_time:", user.start_time)
    # print("end_time:", user.end_time)
    # print("duration:", user.slot_duration_minutes)
    # print("current_start:", current_start)
    # print("end_datetime:", end_datetime)
    while current_start + timedelta(minutes=duration) <= end_datetime:
        slots.append({
            "start_time": current_start.time().strftime("%H:%M:%S"),
            "end_time": (current_start + timedelta(minutes=duration)).time().strftime("%H:%M:%S")
        })
        current_start += timedelta(minutes=duration)
=======
from scheduling.service import get_doctor_availability
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta, date

from entities.Booking import Booking
from entities.DoctorFacility import DoctorAvailability


def slot_generator(
    db: Session,
    current_user: UUID,
    target_date: date = None,
    facility_id: UUID = None,
):
    """
    Generate available booking slots for a doctor.

    Args:
        db: Database session
        current_user: Doctor UUID
        target_date: Date to generate slots for (defaults to today)
        facility_id: Optional facility filter

    Returns:
        List of available slot dicts with start_time, end_time, and is_available flag.
    """
    if target_date is None:
        target_date = datetime.today().date()

    day_of_week = target_date.weekday()

    # Query availability for this specific day
    query = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == current_user,
        DoctorAvailability.day_of_week == day_of_week,
        DoctorAvailability.is_active == True,
    )
    if facility_id is not None:
        query = query.filter(DoctorAvailability.facility_id == facility_id)

    availabilities = query.all()

    if not availabilities:
        return []

    # Fetch existing booked appointments for this doctor on the target date
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date, datetime.max.time())

    booked_slots = (
        db.query(Booking)
        .filter(
            Booking.doctor_id == current_user,
            Booking.status == "booked",
            Booking.start_ts >= day_start,
            Booking.start_ts <= day_end,
        )
        .all()
    )

    # Build a set of booked start times for fast lookup
    booked_start_times = set()
    for b in booked_slots:
        booked_start_times.add(b.start_ts.strftime("%H:%M:%S"))

    slots = []
    for avail in availabilities:
        start_time = avail.start_time
        end_time = avail.end_time
        duration = avail.slot_duration_minutes

        current_start = datetime.combine(target_date, start_time)
        end_datetime = datetime.combine(target_date, end_time)

        while current_start + timedelta(minutes=duration) <= end_datetime:
            slot_start_str = current_start.time().strftime("%H:%M:%S")
            slot_end_str = (current_start + timedelta(minutes=duration)).time().strftime("%H:%M:%S")
            is_available = slot_start_str not in booked_start_times

            slots.append({
                "start_time": slot_start_str,
                "end_time": slot_end_str,
                "is_available": is_available,
            })
            current_start += timedelta(minutes=duration)
>>>>>>> 561e94f (MVP version 1)

    return slots