import React from "react";
import useSpeechRecognition from "./useSpeechRecognition";

const SpeechRecognitionComponent = () => {
  const {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  return (
    <div>
      <h2>Speech Recognition</h2>

      <button onClick={startListening} disabled={isListening}>
        Start
      </button>
      <button onClick={stopListening} disabled={!isListening}>
        Stop
      </button>
      <button onClick={resetTranscript}>Reset</button>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div style={{ marginTop: "1rem", padding: "0.5rem", border: "1px solid #ccc" }}>
        <strong>Transcript:</strong>
        <p>{transcript}</p>
      </div>
    </div>
  );
};

export default SpeechRecognitionComponent;
