from entities.ReportMaster import ReportMaster
from entities.DoctorReport import DoctorReport
from entities.PatientReport import PatientReport
<<<<<<< HEAD


from sqlalchemy.orm import Session
from uuid import UUID


def get_patient_report(db:Session, patient_id : UUID):
    patient_report = db.query(ReportMaster.doctor_id, PatientReport.report_md).join(ReportMaster, PatientReport.master_id == ReportMaster.id).filter(ReportMaster.patient_id == patient_id).order_by(ReportMaster.created_at.desc()).all()
    return {row[0]:row[1] for row in patient_report}

# def get_doctor_report(db:Session, patient_id : UUID):
#     patient_report = db.query(PatientReport.report_md).join(ReportMaster, PatientReport.master_id == ReportMaster.id).filter(ReportMaster.patient_id == patient_id).order_by(ReportMaster.created_at.desc()).all()
#     return patient_report

def get_doctor_report(db:Session, doctor_id:UUID):
    doctor_report = db.query(DoctorReport.report_md, ReportMaster.patient_id).join(ReportMaster, DoctorReport.master_id == ReportMaster.id).filter(ReportMaster.doctor_id == doctor_id).order_by(ReportMaster.created_at.desc()).all()
    return [row[0] for row in doctor_report]
=======
from entities.Booking import Booking
from entities.Patients import Patient

from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String
from uuid import UUID


def get_patient_report(db: Session, patient_id: UUID):
    patient_report = db.query(
        ReportMaster.id,
        ReportMaster.doctor_id,
        ReportMaster.booking_id,
        ReportMaster.created_at,
        PatientReport.report_md,
    ).join(
        PatientReport, PatientReport.master_id == ReportMaster.id
    ).filter(ReportMaster.patient_id == patient_id).order_by(ReportMaster.created_at.desc()).all()
    return [
        {
            "report_id": str(row[0]),
            "doctor_id": str(row[1]),
            "booking_id": str(row[2]) if row[2] else None,
            "created_at": row[3].isoformat() if row[3] else None,
            "report_md": row[4],
        }
        for row in patient_report
    ]


def get_doctor_report(db: Session, doctor_id: UUID):
    doctor_report = db.query(
        DoctorReport.report_md,
        ReportMaster.patient_id,
        ReportMaster.created_at,
    ).join(
        ReportMaster, DoctorReport.master_id == ReportMaster.id
    ).filter(
        ReportMaster.doctor_id == doctor_id
    ).order_by(ReportMaster.created_at.desc()).all()

    if not doctor_report:
        patient_ids = db.query(Booking.patient_id).filter(
            Booking.doctor_id == doctor_id
        ).distinct().all()
        patient_id_list = [p[0] for p in patient_ids]

        if patient_id_list:
            doctor_report = db.query(
                DoctorReport.report_md,
                ReportMaster.patient_id,
                ReportMaster.created_at,
            ).join(
                ReportMaster, DoctorReport.master_id == ReportMaster.id
            ).filter(
                ReportMaster.patient_id.in_(patient_id_list)
            ).order_by(ReportMaster.created_at.desc()).all()

    return [
        {
            "patient_id": str(row[1]),
            "report_md": row[0],
            "created_at": row[2].isoformat() if row[2] else None,
        }
        for row in doctor_report
    ]


def search_patients_for_doctor(db: Session, doctor_id: UUID, query: str):
    """
    Return a list of distinct patients who have DoctorReport rows visible to
    this doctor, optionally filtered by name / id / phone.
    """
    # Patients who booked with this doctor OR whose reports are linked directly
    patient_ids_from_booking = (
        db.query(Booking.patient_id)
        .filter(Booking.doctor_id == doctor_id)
        .distinct()
        .subquery()
    )

    patient_ids_from_reports = (
        db.query(ReportMaster.patient_id)
        .filter(ReportMaster.doctor_id == doctor_id)
        .distinct()
        .subquery()
    )

    base_q = db.query(
        Patient.id,
        Patient.first_name,
        Patient.last_name,
        Patient.phoneNo,
    ).filter(
        or_(
            Patient.id.in_(patient_ids_from_booking),
            Patient.id.in_(patient_ids_from_reports),
        )
    )

    if query:
        q_like = f"%{query.lower()}%"
        base_q = base_q.filter(
            or_(
                (Patient.first_name + " " + Patient.last_name).ilike(q_like),
                Patient.first_name.ilike(q_like),
                Patient.last_name.ilike(q_like),
                Patient.phoneNo.ilike(q_like),
                cast(Patient.id, String).ilike(q_like),
            )
        )

    rows = base_q.all()

    # Count reports per patient
    result = []
    for row in rows:
        report_count = db.query(DoctorReport).join(
            ReportMaster, DoctorReport.master_id == ReportMaster.id
        ).filter(ReportMaster.patient_id == row[0]).count()

        result.append({
            "patient_id": str(row[0]),
            "name": f"{row[1]} {row[2]}",
            "first_name": row[1],
            "last_name": row[2],
            "phone": row[3],
            "report_count": report_count,
        })

    return result


def get_patient_reports_for_doctor(db: Session, doctor_id: UUID, patient_id: str):
    """Get all reports for a specific patient visible to this doctor."""
    from uuid import UUID as _UUID
    try:
        pid = _UUID(patient_id)
    except ValueError:
        return []

    reports = db.query(
        DoctorReport.report_md,
        ReportMaster.created_at,
        ReportMaster.id,
    ).join(
        ReportMaster, DoctorReport.master_id == ReportMaster.id
    ).filter(
        ReportMaster.patient_id == pid,
    ).order_by(ReportMaster.created_at.desc()).all()

    return [
        {
            "report_id": str(row[2]),
            "report_md": row[0],
            "created_at": row[1].isoformat() if row[1] else None,
        }
        for row in reports
    ]
>>>>>>> 561e94f (MVP version 1)
