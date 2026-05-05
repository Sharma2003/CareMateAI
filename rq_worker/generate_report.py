# rq_worker/jobs/report_job.py

import asyncio
import logging
from uuid import UUID

from sqlalchemy.orm import Session
from database.core import SessionLocal
import entities  # ensures models are registered

from entities.ReportMaster import ReportMaster
from entities.PatientReport import PatientReport
from entities.DoctorReport import DoctorReport

from chat.src.graph.nodes import update_report
from chat.src.graph.state import InterviewReport

logger = logging.getLogger(__name__)


def generate_reports_job(patient_id, doctor_id, state: dict, booking_id):
    db: Session = SessionLocal()

    try:
        logger.info(f"Starting report generation for patient={patient_id}")


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

        # Add reports
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

        logger.info(f"Report generation completed: master_id={master.id}")

    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}")

        db.rollback()

        try:
            failed_master = ReportMaster(
                patient_id=UUID(patient_id),
                doctor_id=UUID(doctor_id),
                booking_id=UUID(booking_id),
                job_status='failed'
            )
            db.add(failed_master)
            db.commit()
        except Exception:
            db.rollback()

        raise e

    finally:
        db.close()