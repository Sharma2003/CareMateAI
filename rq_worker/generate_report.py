from uuid import UUID
from redis import Redis
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database.core import SessionLocal
import entities  # registers ALL mappers before any relationship is resolved
from entities.ReportMaster import ReportMaster
from entities.PatientReport import PatientReport
from entities.DoctorReport import DoctorReport
from chat.src.graph.nodes import update_report
from chat.src.graph.state import InterviewReport
import asyncio

load_dotenv()
redis = Redis(
    host="localhost",
    port=6380,
    db=0,
    decode_responses=False
)


def generate_reports_job(patient_id, doctor_id, state: dict, booking_id):
    db: Session = SessionLocal()

    try:
        report_state = InterviewReport(**state)
        updated_state = asyncio.run(update_report(state=report_state))

        master = ReportMaster(
            patient_id=UUID(patient_id),
            doctor_id=UUID(doctor_id),
            booking_id=UUID(booking_id) if booking_id and booking_id != 'None' else None,
            job_status='completed'
        )
        db.add(master)
        db.flush()

        db.add(PatientReport(
            master_id=master.id,
            report_md=updated_state.patient_report_md
        ))

        db.add(DoctorReport(
            master_id=master.id,
            report_md=updated_state.doctor_report_md
        ))

        db.commit()
        db.refresh(master)

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()