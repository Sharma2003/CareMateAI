"""
STT Controller — AssemblyAI Universal Streaming v3

WS  /stt/stream
    Browser connects → sends raw PCM/webm audio chunks over WebSocket →
    this proxy forwards them to AssemblyAI streaming endpoint →
    receives TurnEvent (partial + final) and forwards JSON back to browser.

    Messages FROM browser  : binary audio bytes (raw PCM 16-bit LE, 16 kHz)
    Messages TO   browser  : JSON strings
        { "type": "partial", "text": "hello wor" }
        { "type": "final",   "text": "Hello world." }
        { "type": "error",   "text": "..." }
        { "type": "ready"  }         ← session started
        { "type": "done"   }         ← session terminated

GET /stt/health  → provider status
"""

import os
import json
import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stt", tags=["stt"])

API_KEY     = os.getenv("ASSEMBLYAI_API_KEY")
SAMPLE_RATE = 16_000
AAI_WS_URL  = (
    f"wss://streaming.assemblyai.com/v3/ws"
    f"?sample_rate={SAMPLE_RATE}"
    f"&speech_model=universal-streaming-english"
    f"&token={API_KEY}"
)


@router.websocket("/stream")
async def stt_stream(ws: WebSocket):
    """
    Bi-directional WebSocket proxy:
      Browser  ──(audio bytes)──►  FastAPI  ──(audio bytes)──►  AssemblyAI
      Browser  ◄──(JSON events)──  FastAPI  ◄──(JSON events)──  AssemblyAI
    """
    await ws.accept()
    logger.info("🎤 [STT] WebSocket client connected")

    try:
        import websockets
    except ImportError:
        await ws.send_text(json.dumps({"type": "error", "text": "websockets package not installed. Run: pip install websockets"}))
        await ws.close()
        return

    try:
        async with websockets.connect(AAI_WS_URL) as aai_ws:
            logger.info("🎤 [STT] Connected to AssemblyAI streaming v3")

            async def browser_to_aai():
                """Forward binary audio from browser → AssemblyAI."""
                try:
                    while True:
                        data = await ws.receive_bytes()
                        await aai_ws.send(data)
                except (WebSocketDisconnect, Exception):
                    # Browser disconnected — tell AssemblyAI to terminate
                    try:
                        await aai_ws.send(json.dumps({"type": "Terminate"}))
                    except Exception:
                        pass

            async def aai_to_browser():
                """Forward AssemblyAI events → browser as JSON."""
                try:
                    async for raw in aai_ws:
                        try:
                            event = json.loads(raw)
                        except Exception:
                            continue

                        msg_type = event.get("type", "")

                        if msg_type == "Begin":
                            await ws.send_text(json.dumps({"type": "ready"}))
                            logger.info(f"🎤 [STT] Session started: {event.get('id')}")

                        elif msg_type == "Turn":
                            transcript = event.get("transcript", "")
                            end_of_turn = event.get("end_of_turn", False)
                            if transcript:
                                if end_of_turn:
                                    await ws.send_text(json.dumps({"type": "final",   "text": transcript}))
                                    logger.info(f"🎤 [STT] FINAL: {transcript[:80]}")
                                else:
                                    await ws.send_text(json.dumps({"type": "partial", "text": transcript}))

                        elif msg_type == "Termination":
                            await ws.send_text(json.dumps({"type": "done"}))
                            logger.info("🎤 [STT] Session terminated")
                            break

                        elif msg_type == "Error" or "error" in event:
                            err = event.get("error", event.get("message", "Unknown error"))
                            await ws.send_text(json.dumps({"type": "error", "text": err}))
                            logger.error(f"🎤 [STT] AssemblyAI error: {err}")

                except Exception as e:
                    logger.error(f"🎤 [STT] aai_to_browser error: {e}")
                    try:
                        await ws.send_text(json.dumps({"type": "error", "text": str(e)}))
                    except Exception:
                        pass

            # Run both directions concurrently
            await asyncio.gather(browser_to_aai(), aai_to_browser())

    except WebSocketDisconnect:
        logger.info("🎤 [STT] Browser disconnected")
    except Exception as e:
        logger.error(f"🎤 [STT] Stream error: {e}")
        try:
            await ws.send_text(json.dumps({"type": "error", "text": str(e)}))
        except Exception:
            pass
    finally:
        logger.info("🎤 [STT] WebSocket session closed")


@router.get("/health")
async def stt_health():
    return {
        "provider": "AssemblyAI Streaming v3",
        "loaded":   True,
        "status":   "ready",
        "model":    "universal-streaming-english",
    }
