# ─────────────────────────────────────────────────────────────────────────────
# CareMate — FastAPI Backend
# Multi-stage build: keeps the final image lean and layer-cache friendly
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.12.10-slim AS builder

WORKDIR /app

# System build deps (only needed to compile wheels — not in final image)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install into a prefix so we can copy just this folder into the final stage
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.12.10-slim

# Runtime-only system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN addgroup --system caremate && adduser --system --ingroup caremate caremate

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=caremate:caremate . .

# Persistent upload directory
RUN mkdir -p /app/uploads/avatars && chown -R caremate:caremate /app/uploads

USER caremate

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]