import { useEffect, useRef, useState } from "react";

const useSpeechRecognition = ({
  lang = "en-US",
  continuous = true,
  interimResults = true,
} = {}) => {
  const recognitionRef = useRef(null);
  const [transcript, setTranscript] = useState("");
  const [preTranscript, setPreTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => setError(event.error);

    recognition.onresult = (event) => {
      let newTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        newTranscript += event.results[i][0].transcript;
      }
      setPreTranscript((prev) => prev + " " + newTranscript);
      const currentTranscript = event.results[event.resultIndex][0].transcript;
      setTranscript(currentTranscript);
    };

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [lang, continuous, interimResults]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const resetTranscript = () => setTranscript("");

  const toggleListening = () => {
    isListening ? stopListening() : startListening();
  };

  return {
    preTranscript,
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    resetTranscript,
    toggleListening,
  };
};

export default useSpeechRecognition;
