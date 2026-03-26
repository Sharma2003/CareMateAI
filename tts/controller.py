"""
TTS Controller — FastAPI routes for microsoft/speecht5_tts

POST /tts/speak   → returns audio/wav (16 kHz mono)
GET  /tts/health  → model load status
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
import logging

from auth.service import CurrentUser
from tts.service import synthesize_speech

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str


@router.post("/speak")
async def speak(req: TTSRequest, current_user: CurrentUser):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")

    # run_in_threadpool keeps the async event loop unblocked during inference
    audio_bytes = await run_in_threadpool(synthesize_speech, req.text)

    if audio_bytes is None:
        raise HTTPException(
            status_code=503,
            detail="TTS model unavailable — browser speech fallback will be used",
        )

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'inline; filename="speech.wav"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/health")
async def tts_health():
    from tts.service import _load_done, _load_ok
    status = "ready" if _load_ok else ("loading" if not _load_done else "failed")
    return {
        "model": "microsoft/speecht5_tts",
        "loaded": _load_ok,
        "status": status,
    }
