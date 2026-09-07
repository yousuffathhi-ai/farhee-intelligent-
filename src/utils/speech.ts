/**
 * Speech Recognition and Speech Synthesis Utilities for Farhee Intelligent
 */

// Check for Web Speech API SpeechRecognition
export const getSpeechRecognition = (): any => {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
};

export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender?: 'female' | 'male';
}

export const SpeechService = {
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      navigator.mediaDevices?.getUserMedia
    );
  },

  isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSynthesisSupported()) return [];
    return window.speechSynthesis.getVoices();
  },

  speakText(
    text: string,
    options?: {
      voiceName?: string;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): SpeechSynthesisUtterance | null {
    if (!this.isSynthesisSupported()) return null;

    window.speechSynthesis.cancel();

    // Clean text of markdown characters, URLs, code blocks
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' Code snippet omitted for speech. ')
      .replace(/[*_#`~[\]$]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return null;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options?.rate || 1.05;
    utterance.pitch = options?.pitch || 1.0;

    const voices = this.getAvailableVoices();
    if (options?.voiceName && voices.length > 0) {
      const selected = voices.find(v => v.name.toLowerCase().includes(options.voiceName!.toLowerCase()));
      if (selected) {
        utterance.voice = selected;
      }
    } else if (voices.length > 0) {
      // Pick a natural English or local voice if available
      const natural = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Enhanced')));
      if (natural) {
        utterance.voice = natural;
      }
    }

    utterance.onstart = () => {
      if (options?.onStart) options.onStart();
    };

    utterance.onend = () => {
      if (options?.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      if (options?.onError) options.onError(e);
    };

    window.speechSynthesis.speak(utterance);
    return utterance;
  },

  stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * Fallback: Record audio via MediaRecorder and send to /api/audio/transcribe
   */
  async recordAndTranscribe(durationMs: number = 5000): Promise<string> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported on this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            const res = await fetch('/api/audio/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Data, mimeType: 'audio/webm' }),
            });
            if (res.ok) {
              const data = await res.json();
              resolve(data.transcript || '');
            } else {
              resolve('');
            }
          } catch {
            resolve('');
          }
        };
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, durationMs);
    });
  }
};
