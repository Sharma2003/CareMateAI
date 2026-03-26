/**
 * useStreamingMic — Real-time STT via AssemblyAI Streaming v3
 *
 * Architecture:
 *   Browser mic → AudioWorklet (PCM 16-bit LE 100ms chunks) → WebSocket → FastAPI proxy
 *   FastAPI proxy → AssemblyAI streaming.assemblyai.com → JSON events back to browser
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Dynamic WS URL — uses same host as the API (works for localhost and network)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL   = API_BASE.replace(/^http/, 'ws') + '/stt/stream';

const SAMPLE_RATE   = 16_000;
const CHUNK_SAMPLES = 1600;   // 100ms at 16 kHz — within AssemblyAI's 50–1000ms window

const PCM_WORKLET_CODE = `
const CHUNK_SAMPLES = ${CHUNK_SAMPLES};

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Int16Array(CHUNK_SAMPLES);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    for (let i = 0; i < input.length; i++) {
      this._buffer[this._offset++] = Math.max(-32768, Math.min(32767, input[i] * 32768));
      if (this._offset >= CHUNK_SAMPLES) {
        this.port.postMessage(this._buffer.buffer, [this._buffer.buffer]);
        this._buffer = new Int16Array(CHUNK_SAMPLES);
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

export default function useStreamingMic({ mode = 'chat', onPartial, onFinal, onError }) {
    const [recording,  setRecording]  = useState(false);
    const [connected,  setConnected]  = useState(false);
    const [error,      setError]      = useState('');

    const wsRef          = useRef(null);
    const streamRef      = useRef(null);
    const audioCtxRef    = useRef(null);
    const workletNodeRef = useRef(null);
    const blobUrlRef     = useRef(null);

    useEffect(() => { return () => _cleanup(); }, []);

    const _cleanup = useCallback(() => {
        workletNodeRef.current?.disconnect();
        workletNodeRef.current = null;
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        wsRef.current?.close();
        wsRef.current = null;
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
        setConnected(false);
        setRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
        setError('');
        try {
            // 1. Open WebSocket to FastAPI proxy
            const ws = new WebSocket(WS_URL);
            ws.binaryType = 'arraybuffer';
            wsRef.current  = ws;

            ws.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    if (msg.type === 'ready')   { setConnected(true); }
                    else if (msg.type === 'partial') { onPartial?.(msg.text); }
                    else if (msg.type === 'final')   {
                        const text = mode === 'form' ? msg.text.replace(/\.$/, '') : msg.text;
                        onFinal?.(text);
                    }
                    else if (msg.type === 'done')    { _cleanup(); }
                    else if (msg.type === 'error')   {
                        setError(msg.text || 'Streaming error');
                        onError?.(msg.text);
                        _cleanup();
                    }
                } catch (_) {}
            };

            ws.onerror = () => {
                setError('WebSocket connection failed — is the backend running on port 8000?');
                _cleanup();
            };

            ws.onclose = () => { setConnected(false); setRecording(false); };

            await new Promise((resolve, reject) => {
                ws.onopen = resolve;
                setTimeout(() => reject(new Error('WS connect timeout')), 6000);
            });

            // 2. Get microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true },
            });
            streamRef.current = stream;

            // 3. AudioContext + PCM worklet
            const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
            audioCtxRef.current = ctx;

            const blob    = new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;

            await ctx.audioWorklet.addModule(blobUrl);

            const source  = ctx.createMediaStreamSource(stream);
            const worklet = new AudioWorkletNode(ctx, 'pcm-processor');
            workletNodeRef.current = worklet;

            worklet.port.onmessage = (e) => {
                if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
            };

            source.connect(worklet);
            worklet.connect(ctx.destination);
            setRecording(true);

        } catch (err) {
            const msg = err.message?.toLowerCase().includes('permission')
                ? 'Microphone access denied.'
                : `Could not start recording: ${err.message}`;
            setError(msg);
            onError?.(msg);
            _cleanup();
        }
    }, [mode, onPartial, onFinal, onError, _cleanup]);

    const stopRecording = useCallback(() => {
        workletNodeRef.current?.disconnect();
        workletNodeRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        wsRef.current?.close();
        setRecording(false);
        setConnected(false);
    }, []);

    const clearError = useCallback(() => setError(''), []);

    return { recording, connected, error, startRecording, stopRecording, clearError };
}
