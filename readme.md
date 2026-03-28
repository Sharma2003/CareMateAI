# CareMate — AI Pre-Consultation Readiness System

CareMate bridges the gap between patients and doctors using AI. Patients complete an AI-conducted pre-arrival interview, and the resulting clinical summary is ready for their doctor before the appointment even starts. Doctors get AI-assisted session recording, editable notes, and prescription management — all in one place.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Running with Docker Compose](#running-with-docker-compose)
- [Running Locally (without Docker)](#running-locally-without-docker)
- [Frontend Setup](#frontend-setup)
- [Project Structure](#project-structure)
- [API Docs](#api-docs)
- [AI Models](#ai-models)

---

## Features

### Patient
- Find nearby clinics and doctors
- Complete an AI-conducted pre-consultation interview (OLDCARTS clinical framework, up to 20 questions)
- View AI-generated consultation report and past history
- Text-to-Speech playback of AI responses (`microsoft/speecht5_tts`)
- Voice input via AssemblyAI real-time streaming STT
- View prescriptions and medication reminders
- Upload and manage medical documents

### Doctor
- Manage schedule and time slot availability
- View patient pre-consultation summaries before sessions begin
- Record consultation sessions with live STT transcription
- Edit and approve AI-generated consultation notes
- Issue prescriptions with medication timings

### Admin
- Facility and doctor management dashboard

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI 0.124, Python 3.12, SQLAlchemy 2.0, Uvicorn |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, RQ (background workers) |
| AI / LLM | MedGemma 27B via Ollama, LangGraph, LangChain |
| TTS | `microsoft/speecht5_tts` + `speecht5_hifigan` (HuggingFace Transformers) |
| STT | AssemblyAI Universal Streaming v3 (WebSocket) |
| Frontend | React 19, Vite 7, React Router v7, Axios |
| Auth | JWT (PyJWT), bcrypt (Passlib) |
| Containerisation | Docker, Docker Compose |

---

## Architecture

```
┌─────────────────────────┐
│   React + Vite          │  http://localhost:5173
│   (Frontend)            │
└────────────┬────────────┘
             │ REST / WebSocket
┌────────────▼────────────┐
│   FastAPI Backend        │  http://localhost:8000
│   (Python 3.12)          │
│                          │
│  auth · users · patients │
│  doctors · booking       │
│  chat (LangGraph)        │
│  consultation · report   │
│  tts · stt · drugs       │
│  scheduling · documents  │
└──┬──────────┬────────────┘
   │          │
┌──▼──┐  ┌───▼──────┐   ┌────────────────┐   ┌──────────────────────┐
│ PG  │  │  Redis   │   │  RQ Worker     │   │  Ollama              │
│ 16  │  │  7       │   │  (report gen)  │   │  MedGemma 27B        │
└─────┘  └──────────┘   └────────────────┘   └──────────────────────┘
```

LangGraph uses Redis for conversation state checkpointing. Background tasks (AI report generation) are dispatched to an RQ worker via Redis queues. All four services — PostgreSQL, Redis, RQ worker, and Ollama — are included in `docker-compose.yaml`.

---

## Prerequisites

- **Docker** >= 24 and **Docker Compose** v2
- **Node.js** >= 18 + **npm** (for the frontend, runs outside Docker)
- A **HuggingFace token** with access to the `Matthijs/cmu-arctic-xvectors` dataset (free, just requires a HF account). Set as `HF_TOKEN` in `.env`.
- An **AssemblyAI API key** for real-time STT. Set as `ASSEMBLYAI_API_KEY` in `.env`.

> **GPU:** SpeechT5 will run on CPU if no CUDA GPU is detected — it works but synthesis is slower. MedGemma via Ollama uses whatever hardware Ollama is configured with. To enable GPU passthrough for Ollama, uncomment the `deploy` block in `docker-compose.yaml` (requires NVIDIA Container Toolkit on Linux).

---

## Environment Variables

Create a `.env` file in the project root before running anything:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_password_here
POSTGRES_DB=mydb
DATABASE_URL=postgresql://postgres:your_strong_password_here@db:5432/mydb

# JWT
SECRET_KEY=generate_a_long_random_hex_string_here
ALGORITHM=HS256

# Redis (resolved inside Docker network)
REDIS_URL=redis://redis:6379/0

# HuggingFace (for SpeechT5 speaker embeddings)
HF_TOKEN=hf_your_token_here

# AssemblyAI (real-time STT)
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
```

> **Never commit `.env` to version control.** It is already listed in `.gitignore`.

To generate a strong `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Running with Docker Compose

This is the recommended way to run the full stack.

### 1. Build and start all services

```bash
docker compose up --build
```

This starts: FastAPI backend, RQ worker, PostgreSQL, Redis, and Ollama.

### 2. Pull the MedGemma model into Ollama

On first run the Ollama container starts empty. Pull the model into it:

```bash
docker exec -it caremate_ollama ollama pull alibayram/medgemma:27b
```

This is a one-time step — the model is stored in the `ollama_data` named volume and persists across restarts.

### 3. Verify

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| Interactive API Docs | http://localhost:8000/docs |
| Ollama | http://localhost:11434 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

On startup the backend automatically creates all database tables and launches warm-up threads for SpeechT5 TTS, MedGemma, and AssemblyAI STT.

### Stopping

```bash
docker compose down          # stop containers, keep volumes
docker compose down -v       # stop containers AND delete all data volumes
```

---

## Running Locally (without Docker)

You will need PostgreSQL and Redis running locally before starting.

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set DATABASE_URL and REDIS_URL in .env to point to your local services

# 4. Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 5. In a separate terminal — start the RQ worker
python -m rq_worker.worker
```

Make sure Ollama is also running locally with the model pulled:
```bash
ollama pull alibayram/medgemma:27b
ollama serve
```

---

## Frontend Setup

The frontend runs outside Docker using Node.js:

```bash
cd CareMate-Frontend
npm install
npm run dev
```

Available at **http://localhost:5173**.

The frontend communicates with the backend at `http://localhost:8000`. If you change the backend port, update the API base URL in `src/api/client.js`.

---

## Project Structure

```
caremate/
├── main.py                      # App entry point, lifespan, CORS, router registration
├── requirements.txt
├── Dockerfile
├── docker-compose.yaml
├── migrate.sql                  # Manual DB migrations (if any)
│
├── entities/                    # SQLAlchemy ORM table definitions
├── database/                    # Engine + session setup
│
├── auth/                        # JWT authentication, login, register
├── users/                       # User CRUD
├── patients/                    # Patient profile management
├── doctors/                     # Doctor profile management
├── admin/                       # Admin dashboard endpoints
│
├── chat/                        # AI interview engine (LangGraph)
│   └── src/
│       ├── core/                # OLDCARTS interview prompts
│       ├── graph/               # LangGraph nodes, edges, state, Redis checkpointing
│       └── utils/               # LLM client, chains, runtime helpers
│
├── consultation_session/        # Doctor session recording
├── consultation_notes/          # AI-generated + editable notes
├── report/                      # Patient report controller
├── rq_worker/                   # RQ background worker (AI report generation)
│
├── prescription/                # Single prescription management
├── prescriptions/               # Prescription history
├── booking/                     # Appointment booking
├── scheduling/                  # Doctor slot management
├── doctorFinder/                # Nearby clinic / doctor search
├── facilities/                  # Facility master data
├── reviews/                     # Doctor reviews
├── documents/                   # Patient document upload and storage
├── drugs/                       # Drug autocomplete (320K+ entries)
│
├── tts/                         # Text-to-Speech (microsoft/speecht5_tts)
├── stt/                         # Speech-to-Text (AssemblyAI WebSocket proxy)
│
├── helper/                      # Auth helpers, time constraints, slot generator
│
└── CareMate-Frontend/           # React 19 + Vite 7 frontend
    └── src/
        ├── pages/               # Login, Register, Dashboard, Chat, Appointments...
        ├── components/          # Sidebar, Modal, MicButton, Icons
        ├── context/             # AuthContext, I18nContext
        ├── hooks/               # useMic, useStreamingMic
        └── api/                 # Axios client (base URL config)
```

---

## API Docs

FastAPI generates interactive docs automatically:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Key route groups:

| Prefix | Description |
|---|---|
| `/auth` | Register, login, token |
| `/users` `/patients` `/doctors` | Profile management |
| `/chat` | AI pre-consultation interview |
| `/booking` `/scheduling` | Appointments and slots |
| `/consultation-session` `/consultation-notes` | Doctor session management |
| `/report` | Patient report |
| `/prescription` `/prescriptions` | Prescription management |
| `/tts` | Text-to-speech synthesis |
| `/stt` | Speech-to-text (REST + WebSocket) |
| `/drugs` | Drug name autocomplete |
| `/doctor-finder` | Nearby doctor search |
| `/uploads` | Static file serving (avatars, documents) |

---

## AI Models

| Model | Purpose | How it runs |
|---|---|---|
| `alibayram/medgemma:27b` | Clinical AI interview + report generation | Ollama container (local) |
| `microsoft/speecht5_tts` + `microsoft/speecht5_hifigan` | Text-to-speech for AI responses | HuggingFace Transformers (in-process) |
| AssemblyAI Universal Streaming v3 | Real-time speech-to-text | AssemblyAI cloud API |

All three are warmed up in background threads at server startup so they are ready before the first user request hits.