<<<<<<< HEAD
# import sys, os
# sys.path.append(os.path.dirname(os.path.abspath(__file__)))

=======
>>>>>>> 561e94f (MVP version 1)
from auth.controller import router as auth_router
from users.controller import router as user_router
from patients.controller import router as patient_router
from doctors.controller import router as doctor_router
from database.core import Base, engine
<<<<<<< HEAD
from facilites.controller import router as facilites_router 
=======
from facilities.controller import router as facilites_router
>>>>>>> 561e94f (MVP version 1)
from scheduling.controller import router as scheduling_router
from doctorFinder.controller import router as doctorFinder_router
from booking.controller import router as booking_router
from chat.controller import router as chat_router
from report.controller import router as report_router
from consultation_session.controller import router as consultation_session_router
from consultation_notes.controller import router as consultation_notes_router
<<<<<<< HEAD

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


Base.metadata.create_all(bind=engine)

app = FastAPI()

=======
from prescription.controller import router as prescription_router
from documents.controller import router as documents_router
from admin.controller import router as admin_router
from drugs.controller import router as drugs_router
from reviews.controller import router as reviews_router
from tts.controller import router as tts_router
from tts.service import warm_up_speecht5
from stt.controller import router as stt_router
from stt.service import warm_up_stt

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from auth.service import CurrentUser
from database.core import DbSession
import os, shutil, threading, logging

logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


def _warm_up_medgemma():
    """Ping Ollama with a tiny prompt so MedGemma is hot in VRAM before first patient."""
    try:
        import ollama
        logger.info("🩺 [startup] Warming up MedGemma via Ollama …")
        ollama.chat(
            model="alibayram/medgemma:27b",
            messages=[{"role": "user", "content": "hi"}],
            options={"num_predict": 1},
        )
        logger.info("🩺 [startup] MedGemma warm-up complete.")
    except Exception as exc:
        logger.warning(f"🩺 [startup] MedGemma warm-up failed (Ollama may not be running yet): {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: launch VibeVoice-1.5B and MedGemma warm-ups in parallel
    background threads so both models are ready before the first user request.
    Neither thread blocks the server from accepting requests.
    """
    t1 = threading.Thread(target=warm_up_speecht5, daemon=True, name="speecht5-warmup")
    t2 = threading.Thread(target=_warm_up_medgemma, daemon=True, name="medgemma-warmup")
    t3 = threading.Thread(target=warm_up_stt, daemon=True, name="stt-warmup")
    t1.start()
    t2.start()
    t3.start()
    logger.info("🚀 [startup] Model warm-up threads launched (SpeechT5 + MedGemma + KyutaiSTT).")
    yield
    # shutdown — nothing special needed; threads are daemons


app = FastAPI(lifespan=lifespan)
>>>>>>> 561e94f (MVP version 1)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
<<<<<<< HEAD
        "*"   # allow all for development
=======
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
>>>>>>> 561e94f (MVP version 1)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< HEAD
=======
UPLOAD_ROOT = os.path.join(os.path.dirname(__file__), "uploads")
AVATAR_ROOT = os.path.join(UPLOAD_ROOT, "avatars")
os.makedirs(UPLOAD_ROOT, exist_ok=True)
os.makedirs(AVATAR_ROOT, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")
>>>>>>> 561e94f (MVP version 1)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(patient_router)
app.include_router(doctor_router)
app.include_router(facilites_router)
app.include_router(scheduling_router)
app.include_router(doctorFinder_router)
app.include_router(booking_router)
app.include_router(chat_router)
app.include_router(report_router)
app.include_router(consultation_session_router)
app.include_router(consultation_notes_router)
<<<<<<< HEAD
# @app.post("/finish_interview")
# async def finish_interview(session_id: str, doctor_id: UUID, current_user: CurrentUser):

#     # Push report generation task to Redis Queue
#     report_queue.enqueue(
#         generate_reports_job,
#         session_id=session_id,
#         patient_id=current_user.get_uuid(),
#         doctor_id=doctor_id,
#         job_timeout=900  # optional
#     )

    # return {"message": "Report generation started"}


# redis_conn = Redis(host="localhost",port=6380,db=0, decode_responses=False)

# @app.post("/get_chat")
# def get_chat():
#     redis_conn.getrange(,0,-1)

# @app.on_event("startup")    
# async def startup():
#     await init_graph()
#     # Base.metadata.create_all(bind=engine)
@app.get("/")
def hello():
    return {"Hello": "World"}

=======
app.include_router(prescription_router)
app.include_router(documents_router)
app.include_router(admin_router)
app.include_router(drugs_router)
app.include_router(reviews_router)
app.include_router(tts_router)
app.include_router(stt_router)


@app.post("/user/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: DbSession = None,
    current_user: CurrentUser = None,
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or GIF images allowed")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{current_user.get_uuid()}.{ext}"
    path = os.path.join(AVATAR_ROOT, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"avatar_url": f"/uploads/avatars/{filename}"}


@app.get("/user/avatar/{user_id}")
def get_avatar(user_id: str):
    for ext in ["jpg", "jpeg", "png", "webp", "gif"]:
        path = os.path.join(AVATAR_ROOT, f"{user_id}.{ext}")
        if os.path.exists(path):
            return FileResponse(path)
    raise HTTPException(status_code=404, detail="No avatar found")


@app.get("/")
def hello():
    return {"Hello": "World"}
>>>>>>> 561e94f (MVP version 1)
