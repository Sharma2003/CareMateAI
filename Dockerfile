# ─────────────────────────────────────────────────────────────────────────────
# CareMate — FastAPI Backend
# Python 3.12 slim, non-root user, production-ready
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12.10-slim

# ── System deps ───────────────────────────────────────────────────────────────
# libpq-dev  → psycopg2-binary needs libpq at runtime
# ffmpeg     → pydub audio processing (STT pipeline)
# curl       → healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN addgroup --system caremate && adduser --system --ingroup caremate caremate

WORKDIR /app

# ── Python deps (cached layer — only rebuilds when requirements change) ────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Application source ────────────────────────────────────────────────────────
COPY --chown=caremate:caremate . .

# ── Upload directory (avatars, documents) ─────────────────────────────────────
RUN mkdir -p /app/uploads/avatars && chown -R caremate:caremate /app/uploads

# ── Switch to non-root ────────────────────────────────────────────────────────
USER caremate

# ── Expose port ───────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# ── Start server ──────────────────────────────────────────────────────────────
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]