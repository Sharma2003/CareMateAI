/**
 * MicButton — inline mic icon button for form fields
 *
 * Props:
 *   recording  bool     — is currently recording
 *   loading    bool     — waiting for transcription result
 *   error      string   — error message (shown as tooltip-style text below)
 *   onStart    fn       — called when user clicks to start
 *   onStop     fn       — called when user clicks to stop
 *   onClear    fn       — clears the error
 *   disabled   bool     — disables the button
 */

export default function MicButton({ recording, loading, error, onStart, onStop, onClear, disabled }) {
    return (
        <span className="mic-field-wrapper">
            <button
                type="button"
                className={`mic-field-btn${recording ? ' recording' : ''}${loading ? ' loading' : ''}`}
                onClick={recording ? onStop : onStart}
                disabled={disabled || loading}
                title={recording ? 'Stop recording' : loading ? 'Transcribing…' : 'Speak to fill this field'}
            >
                {loading ? <span className="mic-field-spinner" /> : recording ? '🔴' : '🎤'}
            </button>
            {error && (
                <span className="mic-field-error">
                    {error}
                    <button type="button" className="mic-field-error-close" onClick={onClear}>×</button>
                </span>
            )}
        </span>
    );
}
