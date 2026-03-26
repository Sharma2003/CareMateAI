"""
TTS Service — microsoft/speecht5_tts

Uses HuggingFace `transformers` (already in requirements.txt).
Three components loaded once at startup:
  - SpeechT5Processor          (tokeniser)
  - SpeechT5ForTextToSpeech    (encoder-decoder)
  - SpeechT5HifiGan            (vocoder: microsoft/speecht5_hifigan)

Speaker embedding: loaded once from Matthijs/cmu-arctic-xvectors (public dataset).
Output: 16 kHz mono WAV bytes.

Thread-safety:
  threading.Lock  — only one thread ever enters the load block
  threading.Event — all other callers block until loading finishes
  BaseException   — catches KeyboardInterrupt so a failed/interrupted download
                    never triggers a re-download on the next request
"""

import io
import os
import re
import threading
import tempfile
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Single-load guards ────────────────────────────────────────────────────────
_load_lock  = threading.Lock()
_load_event = threading.Event()   # set when load attempt finishes (pass OR fail)
_load_done  = False
_load_ok    = False

# Model components (set once on success)
_processor  = None
_model      = None
_vocoder    = None
_speaker_emb = None   # torch.Tensor [1, 512] — reused for every request

SAMPLE_RATE = 16_000   # SpeechT5 always outputs 16 kHz

# Speaker index from Matthijs/cmu-arctic-xvectors validation split
# 7306 = a clear, neutral American English male voice
SPEAKER_IDX = 7306


def _load_model() -> bool:
    global _processor, _model, _vocoder, _speaker_emb, _load_done, _load_ok

    if _load_done:
        return _load_ok

    with _load_lock:
        if _load_done:   # double-check inside lock
            return _load_ok

        logger.info("🔊 [TTS] Loading microsoft/speecht5_tts …")
        try:
            import torch
            from transformers import (
                SpeechT5Processor,
                SpeechT5ForTextToSpeech,
                SpeechT5HifiGan,
            )
            from datasets import load_dataset

            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"🔊 [TTS] Device: {device}")

            # ── Processor (tokeniser + feature extractor) ─────────────────
            _processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")

            # ── TTS model ─────────────────────────────────────────────────
            _model = SpeechT5ForTextToSpeech.from_pretrained(
                "microsoft/speecht5_tts"
            ).to(device)
            _model.eval()

            # ── Vocoder (mel → waveform) ───────────────────────────────────
            _vocoder = SpeechT5HifiGan.from_pretrained(
                "microsoft/speecht5_hifigan"
            ).to(device)
            _vocoder.eval()

            # ── Speaker embedding (downloaded once, ~30 MB dataset) ────────
            logger.info("🔊 [TTS] Loading speaker embeddings …")
            emb_dataset = load_dataset(
                "Matthijs/cmu-arctic-xvectors",
                split="validation",
                trust_remote_code=True,
            )
            _speaker_emb = torch.tensor(
                emb_dataset[SPEAKER_IDX]["xvector"]
            ).unsqueeze(0).to(device)   # shape [1, 512]

            _load_ok = True
            logger.info("🔊 [TTS] speecht5_tts ready ✓")

        except BaseException as exc:
            # Catches KeyboardInterrupt — never retry the download
            _load_ok = False
            import traceback
            logger.error(
                f"🔊 [TTS] speecht5_tts FAILED to load\n"
                f"  Type : {type(exc).__name__}\n"
                f"  Error: {exc}\n"
                f"  Traceback:\n{''.join(traceback.format_tb(exc.__traceback__))}\n"
                "  Common fixes:\n"
                "    pip install datasets sentencepiece soundfile\n"
                "    pip install --upgrade transformers"
            )
        finally:
            _load_done = True
            _load_event.set()   # unblock any threads waiting in _wait_for_model

    return _load_ok


def warm_up_speecht5():
    """
    Called from FastAPI lifespan startup thread.
    Eagerly loads the model so it's ready before the first user request.
    """
    _load_model()


def _wait_for_model(timeout: float = 300.0) -> bool:
    """Block until the startup load thread finishes (or timeout expires)."""
    if _load_done:
        return _load_ok
    _load_event.wait(timeout=timeout)
    return _load_ok


def _clean_text(text: str) -> str:
    """Strip markdown that the tokeniser can't handle."""
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", text)
    text = re.sub(r"#+\s*", "", text)
    text = re.sub(r"^\s*[-*•]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+[.)]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{2,}", ". ", text)
    text = re.sub(r"\s+", " ", text).strip()
    # SpeechT5 handles up to ~600 chars cleanly; truncate at sentence boundary
    if len(text) > 600:
        cut = text[:600].rfind(". ")
        text = text[:cut + 1] if cut > 100 else text[:600]
    return text


def synthesize_speech(text: str) -> Optional[bytes]:
    """
    text → 16 kHz mono WAV bytes via speecht5_tts.
    Returns None on failure — frontend falls back to browser TTS.
    """
    if not text or not text.strip():
        return None

    if not _wait_for_model(timeout=300.0):
        logger.warning("🔊 [TTS] Model unavailable — returning None.")
        return None

    cleaned = _clean_text(text)
    if not cleaned:
        return None

    try:
        import torch
        import soundfile as sf

        inputs = _processor(text=cleaned, return_tensors="pt")
        input_ids = inputs["input_ids"].to(_speaker_emb.device)

        with torch.no_grad():
            speech = _model.generate_speech(
                input_ids,
                _speaker_emb,
                vocoder=_vocoder,
            )   # returns a 1-D CPU tensor at 16 kHz

        # Convert tensor → WAV bytes in memory
        buf = io.BytesIO()
        sf.write(buf, speech.cpu().numpy(), SAMPLE_RATE, format="WAV")
        buf.seek(0)
        return buf.read()

    except Exception as exc:
        logger.exception(f"🔊 [TTS] Synthesis error: {exc}")
        return None
