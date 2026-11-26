/**
 * AslCheck Pro - Uzbek AI Audio & TTS Engine
 * Provides studio-quality Gemini TTS playback with automatic Web Speech API fallback.
 */

export type AudioPlayState = 'idle' | 'loading' | 'playing';

interface ActivePlayback {
  type: 'html5' | 'speech_synthesis';
  stop: () => void;
  id: string;
}

let activePlayback: ActivePlayback | null = null;
const stateListeners = new Map<string, (state: AudioPlayState) => void>();

/**
 * Clean markdown symbols, bullets, asterisks, URLs, and code blocks
 * so the text reads naturally and pleasantly in Uzbek.
 */
export function cleanTextForAudio(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/```[\s\S]*?```/g, '') // strip code blocks
    .replace(/`([^`]+)`/g, '$1') // strip inline code
    .replace(/\*\*(.*?)\*\*/g, '$1') // strip bold
    .replace(/\*(.*?)\*/g, '$1') // strip italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip links, keep text
    .replace(/^#+\s+/gm, '') // strip header hashes
    .replace(/^[•\-*]\s+/gm, '') // strip bullet markers
    .replace(/^\d+\.\s+/gm, '') // strip numbered list markers
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // strip emojis
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stop any currently active audio or speech synthesis across the entire app
 */
export function stopCurrentAudio(): void {
  if (activePlayback) {
    try {
      activePlayback.stop();
    } catch (e) {
      console.warn('Error stopping active playback:', e);
    }
    const listener = stateListeners.get(activePlayback.id);
    if (listener) listener('idle');
    activePlayback = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Fallback to browser SpeechSynthesis API
 */
function playSpeechSynthesisFallback(
  cleanedText: string,
  playbackId: string,
  onStateChange: (state: AudioPlayState) => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onStateChange('idle');
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanedText);
  utterance.lang = 'uz-UZ';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  // Try to find Uzbek voice if installed in browser/OS
  const voices = window.speechSynthesis.getVoices();
  const uzVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().includes('uz') ||
      v.name.toLowerCase().includes('uzbek') ||
      v.name.toLowerCase().includes('o\'zbek')
  );
  if (uzVoice) {
    utterance.voice = uzVoice;
  }

  utterance.onstart = () => {
    onStateChange('playing');
  };

  utterance.onend = () => {
    onStateChange('idle');
    if (activePlayback?.id === playbackId) {
      activePlayback = null;
    }
  };

  utterance.onerror = (err) => {
    console.warn('SpeechSynthesis error:', err);
    onStateChange('idle');
    if (activePlayback?.id === playbackId) {
      activePlayback = null;
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    onStateChange('idle');
  };

  activePlayback = {
    type: 'speech_synthesis',
    stop,
    id: playbackId,
  };

  window.speechSynthesis.speak(utterance);
  return stop;
}

/**
 * Play text via Serverless Gemini TTS endpoint with instant fallback to Web Speech API
 */
export async function playTextToSpeech(
  rawText: string,
  playbackId: string,
  onStateChange: (state: AudioPlayState) => void
): Promise<() => void> {
  const cleanedText = cleanTextForAudio(rawText);
  if (!cleanedText) {
    onStateChange('idle');
    return () => {};
  }

  // If this exact audio is already playing, stop it (toggle off)
  if (activePlayback && activePlayback.id === playbackId) {
    stopCurrentAudio();
    return () => {};
  }

  // Stop any other currently playing audio
  stopCurrentAudio();

  stateListeners.set(playbackId, onStateChange);
  onStateChange('loading');

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanedText }),
    });

    if (!res.ok) {
      console.warn('Server TTS returned non-OK status, falling back to Web Speech API');
      return playSpeechSynthesisFallback(cleanedText, playbackId, onStateChange);
    }

    const data = await res.json();

    if (data.audioBase64) {
      const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      const audio = new Audio(audioUrl);

      const stop = () => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // ignore
        }
        onStateChange('idle');
      };

      activePlayback = {
        type: 'html5',
        stop,
        id: playbackId,
      };

      audio.onplay = () => {
        onStateChange('playing');
      };

      audio.onended = () => {
        onStateChange('idle');
        if (activePlayback?.id === playbackId) {
          activePlayback = null;
        }
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, falling back to Web Speech API:', e);
        playSpeechSynthesisFallback(cleanedText, playbackId, onStateChange);
      };

      await audio.play();
      return stop;
    } else {
      // Fallback signal from server
      return playSpeechSynthesisFallback(cleanedText, playbackId, onStateChange);
    }
  } catch (err) {
    console.warn('TTS request error, using SpeechSynthesis fallback:', err);
    return playSpeechSynthesisFallback(cleanedText, playbackId, onStateChange);
  }
}
