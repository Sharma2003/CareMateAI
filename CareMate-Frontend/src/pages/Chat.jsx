import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { chatAPI, ttsAPI } from '../api/client';
import useMic from '../hooks/useMic';
import './Chat.css';

// ── TTS helpers ───────────────────────────────────────────────────────────────

async function playAudioBuffer(arrayBuffer) {
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url  = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
        audio.play().catch(reject);
    });
}

function browserSpeak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Chat() {
    const location = useLocation();
    const doctorIdFromNav = location.state?.doctor_id || '00000000-0000-0000-0000-000000000000';
    const bookingIdFromNav = location.state?.booking_id || null;
    const [messages, setMessages]         = useState([]);
    const [input, setInput]               = useState('');
    const [threadId, setThreadId]         = useState(null);
    const [started, setStarted]           = useState(false);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [done, setDone]                 = useState(false);

    // TTS state
    const [ttsEnabled, setTtsEnabled]     = useState(false);
    const [speakingIdx, setSpeakingIdx]   = useState(null);
    const [ttsLoading, setTtsLoading]     = useState(null);
    const [ttsModel, setTtsModel]         = useState('speecht5');
    const ttsAbortRef                     = useRef(false);
    const messagesEnd                     = useRef(null);

    // ── STT — streaming mic ───────────────────────────────────────────────────
    // partialText: live preview while speaking (shown in input as grey placeholder)
    // onFinal: appends the stable sentence to input
    const {
        recording, connected: sttConnected, error: sttError,
        startRecording, stopRecording, clearError: clearSttError,
        partialText,
    } = useMic({
        mode: 'chat',
        onTranscript: useCallback((text) => {
            setInput((prev) => prev ? `${prev} ${text}` : text);
        }, []),
    });

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Poll TTS health until model is ready (loads in background ~60-120s)
    useEffect(() => {
        const checkTTS = () => {
            ttsAPI.health()
                .then((res) => {
                    if (res.data?.loaded) setTtsModel('speecht5');
                    else if (res.data?.status === 'failed') setTtsModel('browser');
                })
                .catch(() => setTtsModel('browser'));
        };
        checkTTS();
        const interval = setInterval(checkTTS, 15000);
        return () => clearInterval(interval);
    }, []);

    // ── TTS ───────────────────────────────────────────────────────────────────

    const speakMessage = useCallback(async (text, idx) => {
        window.speechSynthesis?.cancel();
        ttsAbortRef.current = true;
        await new Promise((r) => setTimeout(r, 50));
        ttsAbortRef.current = false;
        setSpeakingIdx(idx); setTtsLoading(idx);
        try {
            const res = await ttsAPI.speak(text);
            if (ttsAbortRef.current) return;
            setTtsLoading(null);
            await playAudioBuffer(res.data);
        } catch {
            setTtsLoading(null);
            setTtsModel('browser');
            browserSpeak(text);
        } finally { setSpeakingIdx(null); }
    }, []);

    const stopSpeaking = useCallback(() => {
        ttsAbortRef.current = true;
        window.speechSynthesis?.cancel();
        setSpeakingIdx(null); setTtsLoading(null);
    }, []);

    const prevMsgCount = useRef(0);
    useEffect(() => {
        if (!ttsEnabled) return;
        const n = messages.length;
        if (n > prevMsgCount.current && messages[n - 1]?.role === 'assistant')
            speakMessage(messages[n - 1].content, n - 1);
        prevMsgCount.current = n;
    }, [messages, ttsEnabled, speakMessage]);

    // ── Chat actions ──────────────────────────────────────────────────────────

    const startInterview = async () => {
        setLoading(true); setError('');
        try {
            const res = await chatAPI.startInterview();
            setThreadId(res.data.thread_id);
            setMessages([{ role: 'assistant', content: res.data.assistant_reply }]);
            setStarted(true);
        } catch (err) { setError(err.response?.data?.detail || 'Failed to start interview'); }
        setLoading(false);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading || done) return;
        // If mic is still recording, stop it first
        if (recording) stopRecording();
        const userMsg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true); setError('');
        try {
            const res = await chatAPI.nextMessage({
                messages: userMsg,
                thread_id: threadId,
                doctor_id: doctorIdFromNav,
                booking_id: bookingIdFromNav,
                status: 'chatting',
            });
            setMessages((prev) => [...prev, { role: 'assistant', content: res.data.assistant_reply }]);
            if (res.data.status === 'done') setDone(true);
        } catch (err) { setError(err.response?.data?.detail || 'Failed to send message'); }
        setLoading(false);
    };

    // ── mic button state label ────────────────────────────────────────────────
    const micState = !recording ? 'idle'
        : !sttConnected ? 'connecting'
        : 'live';

    const micLabel = { idle: '🎤', connecting: '⏳', live: '🔴' }[micState];
    const micTitle = {
        idle:       'Click to speak (AssemblyAI real-time)',
        connecting: 'Connecting to AssemblyAI…',
        live:       'Recording live — click to stop',
    }[micState];

    // ── Render: start screen ──────────────────────────────────────────────────
    if (!started) {
        return (
            <div>
                <div className="page-header">
                    <h1>AI Pre-Consultation</h1>
                    <p>Have a guided conversation with our AI to prepare for your doctor visit</p>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="card chat-start">
                    <div className="chat-start-icon">💬</div>
                    <h2>Start Your Pre-Consultation Interview</h2>
                    <p>Our AI assistant will ask you about your symptoms, medical history, and concerns to prepare a summary for your doctor.</p>
                    <button className="btn btn-primary btn-lg" onClick={startInterview} disabled={loading}>
                        {loading ? 'Starting...' : 'Begin Interview'}
                    </button>
                </div>
            </div>
        );
    }

    // ── Render: chat screen ───────────────────────────────────────────────────
    return (
        <div>
            <div className="page-header chat-page-header">
                <div>
                    <h1>AI Pre-Consultation</h1>
                    {done && <p style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Interview complete — report is being generated</p>}
                </div>
                <div className="tts-controls">
                    <span className={`tts-model-badge${ttsModel === 'speecht5' ? ' stt-ready' : ''}`}>
                        {ttsModel === 'speecht5' ? '🔊 SpeechT5' : '🔈 Browser TTS'}
                    </span>
                    <span className={`tts-model-badge ${sttConnected ? 'stt-ready' : 'stt-loading'}`}>
                        {sttConnected ? '🎤 AssemblyAI Live' : recording ? '🎤 Connecting…' : '🎤 AssemblyAI'}
                    </span>
                    <label className="tts-toggle-label" title="Auto-speak AI responses">
                        <input type="checkbox" checked={ttsEnabled}
                            onChange={(e) => { setTtsEnabled(e.target.checked); if (!e.target.checked) stopSpeaking(); }} />
                        <span className="tts-toggle-slider"></span>
                        <span className="tts-toggle-text">Auto-speak</span>
                    </label>
                    {speakingIdx !== null && (
                        <button className="btn btn-sm tts-stop-btn" onClick={stopSpeaking}>⏹ Stop</button>
                    )}
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="chat-container card">
                <div className="chat-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`chat-msg ${msg.role}`}>
                            <div className="chat-bubble">
                                {msg.content}
                                {msg.role === 'assistant' && (
                                    <button
                                        className={`tts-speak-btn${speakingIdx === i ? ' speaking' : ''}${ttsLoading === i ? ' loading' : ''}`}
                                        onClick={() => speakingIdx === i ? stopSpeaking() : speakMessage(msg.content, i)}
                                        title={speakingIdx === i ? 'Stop' : 'Read aloud'}
                                        disabled={ttsLoading === i}
                                    >
                                        {ttsLoading === i ? <span className="tts-spinner" /> : speakingIdx === i ? '⏹' : '🔊'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Live partial transcript shown as a ghost message while recording */}
                    {recording && sttConnected && partialText && (
                        <div className="chat-msg user">
                            <div className="chat-bubble chat-bubble-partial">
                                {partialText}
                                <span className="partial-cursor">▋</span>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="chat-msg assistant">
                            <div className="chat-bubble typing"><span></span><span></span><span></span></div>
                        </div>
                    )}
                    <div ref={messagesEnd} />
                </div>

                {sttError && (
                    <div className="stt-error-bar">
                        ⚠ {sttError}
                        <button className="stt-error-close" onClick={clearSttError}>×</button>
                    </div>
                )}

                <form className="chat-input-bar" onSubmit={sendMessage}>
                    <input
                        className="form-input"
                        type="text"
                        placeholder={
                            done          ? 'Interview complete'
                            : recording && !sttConnected ? 'Connecting to AssemblyAI…'
                            : recording   ? 'Listening live… stop mic or press Send'
                            : 'Type or 🎤 to speak in real-time…'
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading || done}
                    />
                    {!done && (
                        <button
                            type="button"
                            className={`btn mic-btn${recording ? ' recording' : ''}${micState === 'connecting' ? ' loading' : ''}`}
                            onClick={recording ? stopRecording : startRecording}
                            disabled={loading || micState === 'connecting'}
                            title={micTitle}
                        >
                            {micLabel}
                        </button>
                    )}
                    <button className="btn btn-primary" type="submit"
                        disabled={loading || (!input.trim() && !recording) || done}>
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}