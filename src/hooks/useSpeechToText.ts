import { useState, useRef, useCallback } from 'react';
import { useToast } from '../components/common/Toast';

export function useSpeechToText(separator: string = '\n') {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechBaseRef = useRef('');
  const finalTranscriptRef = useRef('');
  const { showToast } = useToast();

  const toggleListening = useCallback((currentText: string, onUpdateText: (text: string) => void) => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

    recognition.onresult = (event: any) => {
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
