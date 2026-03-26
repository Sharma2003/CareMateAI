/**
 * useMic — thin wrapper around useStreamingMic for form-field use.
 *
 * Provides the same API as before ({ recording, loading, error, startRecording,
 * stopRecording, clearError }) so Register.jsx and Profile.jsx need zero changes.
 *
 * For form mode:  partial text shown live in the field as you speak,
 *                 final text replaces it (trailing period stripped).
 * For chat mode:  partial shown as live preview, final appended to input.
 */

import { useState, useCallback, useRef } from 'react';
import useStreamingMic from './useStreamingMic';

export default function useMic({ mode = 'chat', onTranscript }) {
    const [partialText, setPartialText] = useState('');
    const lastPartialRef = useRef('');

    const onPartial = useCallback((text) => {
        setPartialText(text);
        lastPartialRef.current = text;
        // For form mode: push live preview directly into the field
        if (mode === 'form') {
            onTranscript(text);
        }
    }, [mode, onTranscript]);

    const onFinal = useCallback((text) => {
        setPartialText('');
        lastPartialRef.current = '';
        onTranscript(text);
    }, [onTranscript]);

    const {
        recording,
        connected,
        error,
        startRecording,
        stopRecording,
        clearError,
    } = useStreamingMic({ mode, onPartial, onFinal });

    return {
        recording,
        loading: recording && !connected,   // "loading" = mic on but AAI not ready yet
        error,
        startRecording,
        stopRecording,
        clearError,
        partialText,    // exposed for Chat to show live preview in input
    };
}
