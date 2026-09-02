// Sistema de Síntese Vocal e Bio-Acústica do ALMA X

class AlmaAudioEngine {
  private audioCtx: AudioContext | null = null;
  private voiceEnabled = true;
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStateChangeCallback: ((speaking: boolean) => void) | null = null;

  constructor() {
    // Lazy AudioContext initialization on first user gesture
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public setSpeakingCallback(cb: (speaking: boolean) => void) {
    this.onStateChangeCallback = cb;
  }

  public toggleMute(): boolean {
    this.voiceEnabled = !this.voiceEnabled;
    if (!this.voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    }
    return this.voiceEnabled;
  }

  public isMuted(): boolean {
    return !this.voiceEnabled;
  }

  // Toca um acorde harmônico etéreo sintetizado em tempo real via Web Audio API
  public playHarmonicChime(freqs: number[] = [432, 648, 864], type: OscillatorType = 'sine', duration = 1.2) {
    if (!this.voiceEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const masterGain = this.audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.08, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterGain.connect(this.audioCtx.destination);

      freqs.forEach((freq, idx) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        if (panner) {
          panner.pan.setValueAtTime((idx - 1) * 0.4, now);
          osc.connect(panner);
          panner.connect(masterGain);
        } else {
          osc.connect(masterGain);
        }

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch {
      // Audio context silently handled
    }
  }

  // Fala diretamente com o usuário usando a voz em português com modulação natural
  public speak(text: string, onEnd?: () => void, priority = false): void {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.initAudio();

      if (priority) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      utterance.lang = 'pt-BR';
      utterance.rate = 1.02; // Ritmo sereno e fluente
      utterance.pitch = 0.95; // Tom sóbrio, caloroso e de autoridade

      // Busca vozes de alta qualidade no navegador
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => (v.lang.includes('pt-BR') || v.lang.includes('pt_BR')) && (v.name.includes('Luciana') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Maria') || v.name.includes('Daniel') || v.name.includes('Premium'))) ||
                      voices.find(v => v.lang.includes('pt'));

      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (this.onStateChangeCallback) this.onStateChangeCallback(true);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (this.onStateChangeCallback) this.onStateChangeCallback(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        if (this.onStateChangeCallback) this.onStateChangeCallback(false);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
      if (onEnd) onEnd();
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    }
  }
}

export const almaVoice = new AlmaAudioEngine();

// Hook de Reconhecimento de Voz Natural (Web Speech API)
export function startAlmaListening(
  onResult: (text: string) => void,
  onError?: () => void,
  onEnd?: () => void
): { stop: () => void } | null {
  if (typeof window === 'undefined') return null;

  const win = window as unknown as Record<string, any>;
  const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    if (onError) onError();
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      onResult(transcript);
    };

    recognition.onerror = () => {
      if (onError) onError();
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
    };
  } catch {
    if (onError) onError();
    return null;
  }
}
