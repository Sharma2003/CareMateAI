"""
Real-Time Transcription using AssemblyAI Universal Streaming v3
---------------------------------------------------------------
INSTALL:
    pip install assemblyai pyaudio

On Windows, if pyaudio fails:
    pip install pipwin
    pipwin install pyaudio

On Linux/Ubuntu:
    sudo apt install portaudio19-dev
    pip install pyaudio
"""

import assemblyai as aai
from assemblyai.streaming.v3 import (
    BeginEvent,
    StreamingClient,
    StreamingClientOptions,
    StreamingError,
    StreamingEvents,
    StreamingParameters,
    TerminationEvent,
    TurnEvent,
)

# ── Config ─────────────────────────────────────────────────────────────────────
API_KEY     = "019fac938f8b4d64866c9e87eaea219b"
SAMPLE_RATE = 16_000
# ───────────────────────────────────────────────────────────────────────────────


def on_begin(self, event: BeginEvent):
    print(f"\n✅  Session started  |  ID: {event.id}")
    print("🎙️  Speak now… (Ctrl+C to stop)\n")


def on_turn(self, event: TurnEvent):
    """
    Called after each 'turn' (a natural pause in speech).
    event.transcript  → the text for this turn
    event.end_of_turn → True when the speaker has finished the turn
    """
    if not event.transcript:
        return

    if event.end_of_turn:
        # Stable, completed sentence
        print(f"\n\033[92m[FINAL]\033[0m {event.transcript}")
    else:
        # Partial / in-progress words — overwrite same line
        print(f"\r\033[93m[...  ]\033[0m {event.transcript:<80}", end="", flush=True)


def on_terminated(self, event: TerminationEvent):
    print(f"\n\n🔴  Session ended  |  Audio processed: {event.audio_duration_seconds:.1f}s")


def on_error(self, error: StreamingError):
    print(f"\n❌  Error: {error}")


def main():
    print("=" * 55)
    print("  AssemblyAI Real-Time Transcription (v3)")
    print("=" * 55)

    # Build the streaming client
    client = StreamingClient(
        StreamingClientOptions(
            api_key=API_KEY,
            api_host="streaming.assemblyai.com",   # use streaming.eu.assemblyai.com for EU
        )
    )

    # Attach event handlers
    client.on(StreamingEvents.Begin,       on_begin)
    client.on(StreamingEvents.Turn,        on_turn)
    client.on(StreamingEvents.Termination, on_terminated)
    client.on(StreamingEvents.Error,       on_error)

    # Connect with desired model & sample rate
    client.connect(
        StreamingParameters(
            speech_model="universal-streaming-english",   # fastest + lowest latency
            # speech_model="u3-rt-pro",                  # most accurate (slightly higher cost)
            sample_rate=SAMPLE_RATE,
        )
    )

    mic = aai.extras.MicrophoneStream(sample_rate=SAMPLE_RATE)

    try:
        client.stream(mic)          # blocks until Ctrl+C
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping…")
    finally:
        client.disconnect(terminate=True)


if __name__ == "__main__":
    main()