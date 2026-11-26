/**
 * AslCheck Pro - Uzbek AI Audio & TTS Engine
 * Studio-quality Gemini TTS playback with iOS/Android gesture unlock,
 * Blob URL streaming, in-memory replay cache, and resilient Web Speech API fallback.
 */

export type AudioPlayState = 'idle' | 'loading' | 'playing';

interface ActivePlayback {
  type: 'html5' | 'speech_synthesis';
  stop: () => void;
  id: string;
  token: number;
}

// 1-sample silent PCM WAV for unlocking iOS Safari / Mobile Chrome Audio element inside click gesture
const SILENT_WAV_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let sharedAudioEl: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let activePlayback: ActivePlayback | null = null;
let activeFetchController: AbortController | null = null;
let sessionTokenCounter = 0;

// Global listeners subscribed by mounted AudioPlayerButton instances
const stateListeners = new Map<string, (state: AudioPlayState) => void>();

// Cache generated WAV Blobs by cleaned text so replays are instant and consume 0 extra quota
const audioBlobCache = new Map<string, Blob>();
const MAX_CACHE_ENTRIES = 15;

function notifyListener(id: string, state: AudioPlayState) {
  const cb = stateListeners.get(id);
  if (cb) cb(state);
}

let loadingPlayerId: string | null = null;
function isIdLoading(id: string): boolean {
  return loadingPlayerId === id;
}

export function subscribePlaybackState(
  id: string,
  listener: (state: AudioPlayState) => void
): () => void {
  stateListeners.set(id, listener);
  if (loadingPlayerId === id) {
    listener('loading');
  } else if (activePlayback?.id === id) {
    listener('playing');
  } else {
    listener('idle');
  }
  return () => {
    stateListeners.delete(id);
  };
}

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!sharedAudioEl) {
    sharedAudioEl = new Audio();
    sharedAudioEl.preload = 'auto';
  }
  return sharedAudioEl;
}

/**
 * Unlock HTML5 Audio playback synchronously inside a user tap/click gesture
 * so later async TTS replies play without browser autoplay blocks.
 */
export function prepareAudioPlaybackGesture(): void {
  unlockAudioOnGesture();
}

function unlockAudioOnGesture(): void {
  const audio = getSharedAudio();
  if (!audio) return;
  try {
    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
    audio.src = SILENT_WAV_URI;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          // Pause silent placeholder if no real audio replaced it yet
          if (audio.src === SILENT_WAV_URI) {
            audio.pause();
          }
        })
        .catch(() => {
          // Safe to ignore on strict environments; Web Speech fallback remains available
        });
    }
  } catch {
    // ignore
  }
}

function revokeCurrentObjectUrl(): void {
  if (currentObjectUrl) {
    try {
      URL.revokeObjectURL(currentObjectUrl);
    } catch {
      // ignore
    }
    currentObjectUrl = null;
  }
}

function base64ToBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Clean markdown symbols, bullets, asterisks, URLs, and code blocks
 * so the text reads naturally and pleasantly in Uzbek.
 */
export function cleanTextForAudio(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/(^|\s)[•\-+]\s+/g, ' ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stop any currently active audio, speech synthesis, or in-flight TTS fetch across the app.
 */
export function stopCurrentAudio(): void {
  sessionTokenCounter++;
  loadingPlayerId = null;

  if (activeFetchController) {
    try {
      activeFetchController.abort();
    } catch {
      // ignore
    }
    activeFetchController = null;
  }

  if (activePlayback) {
    const prevId = activePlayback.id;
    const stopFn = activePlayback.stop;
    activePlayback = null;
    try {
      stopFn();
    } catch (e) {
      console.warn('Error stopping active playback:', e);
    }
    notifyListener(prevId, 'idle');
  }

  // Ensure all listeners reset if any were in loading state
  stateListeners.forEach((cb, key) => {
    if (activePlayback?.id !== key) {
      cb('idle');
    }
  });

  if (sharedAudioEl) {
    try {
      sharedAudioEl.onplay = null;
      sharedAudioEl.onended = null;
      sharedAudioEl.onerror = null;
      sharedAudioEl.pause();
      sharedAudioEl.currentTime = 0;
    } catch {
      // ignore
    }
  }
  revokeCurrentObjectUrl();

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Stop playback only if the specified playerId owns the current playback (safe for unmounts).
 */
export function stopAudioIfOwned(id: string): void {
  if (activePlayback?.id === id || loadingPlayerId === id) {
    stopCurrentAudio();
  }
}

function splitIntoSpeechChunks(text: string, maxLen: number = 170): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if (!s) continue;
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        // Hard-split very long sentences by spaces
        const words = s.split(' ');
        let part = '';
        for (const w of words) {
          if ((part + ' ' + w).trim().length <= maxLen) {
            part = (part + ' ' + w).trim();
          } else {
            if (part) chunks.push(part);
            part = w;
          }
        }
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

/**
 * Resilient browser Web Speech API fallback (handles missing uz-UZ pack and Chrome chunking bugs)
 */
function playSpeechSynthesisFallback(
  cleanedText: string,
  playbackId: string,
  token: number
): void {
  if (token !== sessionTokenCounter) return;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    notifyListener(playbackId, 'idle');
    return;
  }

  const synth = window.speechSynthesis;
  let cancelled = false;

  const stop = () => {
    cancelled = true;
    try {
      synth.cancel();
    } catch {
      // ignore
    }
    notifyListener(playbackId, 'idle');
  };

  activePlayback = {
    type: 'speech_synthesis',
    stop,
    id: playbackId,
    token,
  };

  const startSpeaking = () => {
    if (cancelled || token !== sessionTokenCounter) return;

    const voices = synth.getVoices();
    const uzVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('uz') ||
        v.name.toLowerCase().includes('uzbek') ||
        v.name.toLowerCase().includes("o'zbek")
    );
    // Avoid setting lang='uz-UZ' with no installed voice, which causes synthesis-failed on Windows/macOS
    const trVoice = voices.find((v) => v.lang.toLowerCase().startsWith('tr'));
    const defaultVoice = voices.find((v) => v.default) || voices[0];
    const selectedVoice = uzVoice || trVoice || defaultVoice;

    const chunks = splitIntoSpeechChunks(cleanedText, 175);
    let idx = 0;

    const speakNext = () => {
      if (cancelled || token !== sessionTokenCounter || idx >= chunks.length) {
        if (activePlayback?.token === token) {
          activePlayback = null;
        }
        notifyListener(playbackId, 'idle');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[idx]);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'en-US';
      }
      utterance.rate = 0.96;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (!cancelled && token === sessionTokenCounter) {
          notifyListener(playbackId, 'playing');
        }
      };

      utterance.onend = () => {
        if (!cancelled && token === sessionTokenCounter) {
          idx++;
          speakNext();
        }
      };

      utterance.onerror = (err) => {
        console.warn('SpeechSynthesis chunk error:', err);
        if (activePlayback?.token === token) {
          activePlayback = null;
        }
        notifyListener(playbackId, 'idle');
      };

      synth.speak(utterance);
    };

    const wasBusy = synth.speaking || synth.pending;
    if (wasBusy) {
      synth.cancel();
      setTimeout(speakNext, 60);
    } else {
      speakNext();
    }
  };

  const existingVoices = synth.getVoices();
  if (existingVoices.length > 0) {
    startSpeaking();
  } else {
    let handled = false;
    const onVoices = () => {
      if (handled) return;
      handled = true;
      synth.removeEventListener?.('voiceschanged', onVoices);
      startSpeaking();
    };
    synth.addEventListener?.('voiceschanged', onVoices);
    setTimeout(onVoices, 250);
  }
}

async function playBlobAudio(
  blob: Blob,
  playbackId: string,
  token: number,
  cleanedText: string
): Promise<void> {
  if (token !== sessionTokenCounter) return;

  const audio = getSharedAudio();
  if (!audio) {
    playSpeechSynthesisFallback(cleanedText, playbackId, token);
    return;
  }

  revokeCurrentObjectUrl();
  const objectUrl = URL.createObjectURL(blob);
  currentObjectUrl = objectUrl;

  const stop = () => {
    try {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
    revokeCurrentObjectUrl();
    notifyListener(playbackId, 'idle');
  };

  activePlayback = {
    type: 'html5',
    stop,
    id: playbackId,
    token,
  };

  audio.onplay = () => {
    if (token === sessionTokenCounter) {
      notifyListener(playbackId, 'playing');
    }
  };

  audio.onended = () => {
    if (activePlayback?.token === token) {
      activePlayback = null;
    }
    revokeCurrentObjectUrl();
    notifyListener(playbackId, 'idle');
  };

  audio.onerror = () => {
    console.warn('HTML5 Audio error event, falling back to SpeechSynthesis');
    revokeCurrentObjectUrl();
    playSpeechSynthesisFallback(cleanedText, playbackId, token);
  };

  audio.pause();
  audio.src = objectUrl;
  audio.load();

  try {
    await audio.play();
  } catch (playErr) {
    if (token !== sessionTokenCounter) return;
    console.warn('audio.play() rejected, falling back to SpeechSynthesis:', playErr);
    revokeCurrentObjectUrl();
    playSpeechSynthesisFallback(cleanedText, playbackId, token);
  }
}

/**
 * Play text via Serverless Gemini TTS endpoint with gesture unlock, caching,
 * cancellation safety, and instant Web Speech API fallback.
 */
export async function playTextToSpeech(
  rawText: string,
  playbackId: string,
  options?: { skipGestureUnlock?: boolean }
): Promise<void> {
  const cleanedText = cleanTextForAudio(rawText).slice(0, 1200);
  if (!cleanedText) {
    notifyListener(playbackId, 'idle');
    return;
  }

  // Toggle off if this exact button is already playing or loading
  if (activePlayback?.id === playbackId || (activeFetchController && stateListeners.has(playbackId) && isIdLoading(playbackId))) {
    stopCurrentAudio();
    return;
  }

  // Stop previous audio/fetch synchronously inside user gesture
  stopCurrentAudio();
  const myToken = ++sessionTokenCounter;
  loadingPlayerId = playbackId;

  // CRITICAL: Unlock mobile Safari/Chrome HTMLAudioElement synchronously inside user click
  if (!options?.skipGestureUnlock) {
    unlockAudioOnGesture();
  }

  notifyListener(playbackId, 'loading');

  // Serve immediately from memory cache if already synthesized this session
  const cachedBlob = audioBlobCache.get(cleanedText);
  if (cachedBlob) {
    loadingPlayerId = null;
    await playBlobAudio(cachedBlob, playbackId, myToken, cleanedText);
    return;
  }

  const controller = new AbortController();
  activeFetchController = controller;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanedText }),
      signal: controller.signal,
    });

    if (activeFetchController === controller) {
      activeFetchController = null;
    }
    if (loadingPlayerId === playbackId) {
      loadingPlayerId = null;
    }

    if (myToken !== sessionTokenCounter) return;

    if (!res.ok) {
      playSpeechSynthesisFallback(cleanedText, playbackId, myToken);
      return;
    }

    const data = await res.json();
    if (myToken !== sessionTokenCounter) return;

    if (data?.audioBase64) {
      const blob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
      if (audioBlobCache.size >= MAX_CACHE_ENTRIES) {
        const firstKey = audioBlobCache.keys().next().value;
        if (firstKey !== undefined) audioBlobCache.delete(firstKey);
      }
      audioBlobCache.set(cleanedText, blob);

      await playBlobAudio(blob, playbackId, myToken, cleanedText);
    } else {
      playSpeechSynthesisFallback(cleanedText, playbackId, myToken);
    }
  } catch (err: any) {
    if (activeFetchController === controller) {
      activeFetchController = null;
    }
    if (loadingPlayerId === playbackId) {
      loadingPlayerId = null;
    }
    if (err?.name === 'AbortError' || myToken !== sessionTokenCounter) {
      return;
    }
    console.warn('TTS request error, falling back to SpeechSynthesis:', err);
    playSpeechSynthesisFallback(cleanedText, playbackId, myToken);
  }
}
