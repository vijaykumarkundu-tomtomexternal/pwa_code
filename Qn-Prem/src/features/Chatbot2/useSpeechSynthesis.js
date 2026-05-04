import  { useCallback } from 'react';

export const useSpeechSynthesis = (enabled = true) => {
    const speak = useCallback((text) => {
        if (!enabled) return;
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-US";
        synth.speak(utter);
      }, [enabled]);
      
  return { speak };
}


