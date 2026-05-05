from sqlalchemy import engine_from_config, pool
from alembic import context
import os
from dotenv import load_dotenv
from database.core import Base  # your Base import
from entities import * 
from entities.Booking import Booking
from entities.ConsultationNotes import ConsultationNotes
from entities.ConsultationSession import ConsultationSession
from entities.Doctor import Doctor
from entities.DoctorFacility import DoctorAvailability
from entities.DoctorReport import DoctorReport
from entities.DoctorReview import DoctorReview
from entities.FacilityMaster import Facility
from entities.DocumentStore import DocumentStore
from entities.Drug import Drug
from entities.Patients import Patient
from entities.PatientReport import PatientReport
from entities.Prescription import Prescription
from entities.Users import User
from entities.ReportMaster import ReportMaster

load_dotenv()

config = context.config

db_url = os.getenv("DATABASE_URL")

if not db_url:
    raise ValueError("DATABASE_URL not set")

config.set_main_option("sqlalchemy.url", db_url)

print(Base.metadata.tables.keys())
target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()