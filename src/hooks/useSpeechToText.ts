import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '../components/common/Toast';

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: { transcript?: string };
      isFinal?: boolean;
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function useSpeechToText(separator: string = '\n') {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechBaseRef = useRef('');
  const finalTranscriptRef = useRef('');
  const { showToast } = useToast();

  // Ensure recognition is stopped if the component unmounts while listening (M15)
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = useCallback((currentText: string, onUpdateText: (text: string) => void) => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      showToast('Speech-to-text tidak didukung di browser ini.', 'warning');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognitionRef.current = recognition;
    speechBaseRef.current = currentText.trim();
    finalTranscriptRef.current = '';
    setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let newFinalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) newFinalText += t;
        else interimText += t;
      }
      if (newFinalText) finalTranscriptRef.current += newFinalText;
      const combined = `${speechBaseRef.current}${separator}${finalTranscriptRef.current} ${interimText}`.trim();
      onUpdateText(combined);
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      showToast('Gagal menangkap suara.', 'warning');
    };

    recognition.onend = () => {
      const combined = `${speechBaseRef.current}${separator}${finalTranscriptRef.current}`.trim();
      if (combined) onUpdateText(combined);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }, [isListening, showToast, separator]);

  return { isListening, toggleListening };
}
