from datetime import datetime, time, timedelta


def add_minutes_to_time(start_time: time, minutes: int) -> time:
    """Add `minutes` to a `time` object and return the resulting `time`."""
    dt = datetime.combine(datetime.today(), start_time)
    dt = dt + timedelta(minutes=minutes)
    return dt.time()


def times_overlap(
    start_a: time, end_a: time, start_b: time, end_b: time
) -> bool:
    """Return True if time range [start_a, end_a) overlaps [start_b, end_b)."""
    return start_a < end_b and start_b < end_a


def validate_time_range(start_time: time, end_time: time) -> None:
    """Raise ValueError if end_time is not after start_time."""
    if end_time <= start_time:
        raise ValueError("end_time must be after start_time")


# Keep the old name as an alias for backward compatibility
_add_minutes_to_time = add_minutes_to_time
