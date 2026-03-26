"""
STT Service — AssemblyAI Universal Streaming v3

Kept for backward-compat (used by /stt/transcribe REST fallback).
The primary path is now the WebSocket proxy at /stt/stream.
"""
import os
import logging

logger = logging.getLogger(__name__)

ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY", "019fac938f8b4d64866c9e87eaea219b")


def warm_up_stt():
    logger.info("🎤 [STT] AssemblyAI Streaming v3 ready ✓")
