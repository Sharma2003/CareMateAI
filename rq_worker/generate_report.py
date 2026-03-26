<<<<<<< HEAD
from uuid import uuid4, UUID
=======
from uuid import UUID
>>>>>>> 561e94f (MVP version 1)
from redis import Redis
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database.core import SessionLocal
<<<<<<< HEAD
=======
import entities  # registers ALL mappers before any relationship is resolved
>>>>>>> 561e94f (MVP version 1)
from entities.ReportMaster import ReportMaster
from entities.PatientReport import PatientReport
from entities.DoctorReport import DoctorReport
from chat.src.graph.nodes import update_report
from chat.src.graph.state import InterviewReport
import asyncio

load_dotenv()
redis = Redis(
<<<<<<< HEAD
    host="localhost",    
=======
    host="localhost",
>>>>>>> 561e94f (MVP version 1)
    port=6380,
    db=0,
    decode_responses=False
)


<<<<<<< HEAD
def generate_reports_job(patient_id, doctor_id, state:dict):
    db: Session = SessionLocal()

    try:
        # report_state = InterviewReport(**state)
        report_state = InterviewReport(**state)
        updated_state = asyncio.run(update_report(state=report_state))
        master = ReportMaster(
            patient_id=patient_id,
            doctor_id=doctor_id,
=======
def generate_reports_job(patient_id, doctor_id, state: dict, booking_id):
    db: Session = SessionLocal()

    try:
        report_state = InterviewReport(**state)
        updated_state = asyncio.run(update_report(state=report_state))

        master = ReportMaster(
            patient_id=UUID(patient_id),
            doctor_id=UUID(doctor_id),
            booking_id=UUID(booking_id) if booking_id and booking_id != 'None' else None,
>>>>>>> 561e94f (MVP version 1)
            job_status='completed'
        )
        db.add(master)
        db.flush()

        db.add(PatientReport(
<<<<<<< HEAD
            master_id = master.id,
=======
            master_id=master.id,
>>>>>>> 561e94f (MVP version 1)
            report_md=updated_state.patient_report_md
        ))

        db.add(DoctorReport(
<<<<<<< HEAD
            master_id = master.id,
=======
            master_id=master.id,
>>>>>>> 561e94f (MVP version 1)
            report_md=updated_state.doctor_report_md
        ))

        db.commit()
        db.refresh(master)

<<<<<<< HEAD

=======
>>>>>>> 561e94f (MVP version 1)
    except Exception as e:
        db.rollback()
        raise e
    finally:
<<<<<<< HEAD
        db.close()
=======
        db.close()
>>>>>>> 561e94f (MVP version 1)
