-- ============================================================
--  CareMate Database Migration
--  Run in your PostgreSQL database ONCE before starting server
-- ============================================================

-- 1. Add consultation timing columns to bookings
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS consultation_start_ts TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consultation_end_ts   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consultation_duration_minutes INTEGER;

-- 2. Add in_progress to booking status enum
ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'in_progress';

-- 3. Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id               UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    doctor_id                UUID NOT NULL REFERENCES doctors(id),
    patient_id               UUID NOT NULL REFERENCES patients(id),
    doctor_notes             TEXT,
    diagnosis                TEXT,
    medicines                JSONB DEFAULT '[]'::jsonb,
    referral_to_specialist   VARCHAR,
    referral_notes           TEXT,
    referral_doctor_name     VARCHAR,
    lab_tests                JSONB DEFAULT '[]'::jsonb,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_prescriptions_booking  ON prescriptions(booking_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_doctor   ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS ix_prescriptions_patient  ON prescriptions(patient_id);

-- 4. Create document_store table
CREATE TABLE IF NOT EXISTS document_store (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id          UUID NOT NULL,
    owner_type        VARCHAR NOT NULL CHECK (owner_type IN ('doctor','patient')),
    category          VARCHAR NOT NULL,
    title             VARCHAR(200) NOT NULL,
    description       TEXT,
    file_name         VARCHAR(255) NOT NULL,
    file_path         VARCHAR(500) NOT NULL,
    mime_type         VARCHAR(100),
    file_size_bytes   VARCHAR(20),
    prescription_id   UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    uploaded_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_document_store_owner ON document_store(owner_id);

-- ============================================================
--  Done. Restart FastAPI server after running this migration.
-- ============================================================

-- ── v5: Doctor Reviews ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    doctor_id           UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── v5: Allow admin role in users ──────────────────────────────────────────
-- (Just register with role='admin' — auth model now allows it)
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
-- If role is a plain String column (which it is), no migration needed.

-- ── v6: Drugs table (centralized medicine database) ──────────────────────
CREATE TABLE IF NOT EXISTS drugs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    generic_name    VARCHAR(255),
    brand_name      VARCHAR(255),
    category        VARCHAR(100),
    drug_class      VARCHAR(100),
    common_dosages  VARCHAR(500),
    route           VARCHAR(100) DEFAULT 'oral',
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    usage_count     INTEGER DEFAULT 0,
    source          VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_drugs_name         ON drugs(LOWER(name));
CREATE INDEX IF NOT EXISTS ix_drugs_generic_name ON drugs(LOWER(generic_name));
CREATE INDEX IF NOT EXISTS ix_drugs_is_active    ON drugs(is_active);
