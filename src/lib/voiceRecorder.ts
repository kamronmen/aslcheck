/**
 * AslCheck Pro - Browser Audio Recorder & Real-Time Waveform Analyzer
 * Captures compressed microphone audio (Opus WebM / MP4 AAC for iOS Safari)
 * with live frequency bar levels and clean resource disposal.
 */

export interface RecordedVoiceResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSec: number;
}

export const MAX_VOICE_DURATION_SEC = 45;

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/aac',
];

/**
 * Pick the best MIME type supported by the current browser's MediaRecorder.
 */
export function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  for (const candidate of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    } catch {
      // ignore unsupported query
    }
  }
  return '';
}

/**
 * Strip codec suffix (e.g. "audio/webm;codecs=opus" -> "audio/webm") for Gemini inlineData.
 */
export function normalizeAudioMimeType(mimeType: string): string {
  const clean = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (!clean) return 'audio/webm';
  return clean;
}

/**
 * Convert an audio Blob to a raw base64 string without the data URI prefix.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error('Audio base64 konvertatsiyasida xatolik.'));
        return;
      }
      resolve(result.slice(commaIdx + 1));
    };
    reader.onerror = () => reject(new Error('Audio faylni o‘qib bo‘lmadi.'));
    reader.readAsDataURL(blob);
  });
}

interface VoiceRecorderCallbacks {
  onLevels?: (levels: number[]) => void;
  onDurationTick?: (seconds: number) => void;
  onMaxDurationReached?: () => void;
}

/**
 * Stateful microphone capture session with AudioContext frequency visualizer.
 */
export class VoiceRecorderSession {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private audioCtx: AudioContext | null = null;
  private rafId: number | null = null;
  private timerId: number | null = null;
  private chunks: BlobPart[] = [];
  private selectedMimeType = '';
  private startedAt = 0;
  private isDisposed = false;
  private callbacks: VoiceRecorderCallbacks;

  constructor(callbacks: VoiceRecorderCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Request microphone access and start recording + live spectrum sampling.
   */
  async start(): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      throw new Error('UNSUPPORTED_BROWSER');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    if (this.isDisposed) {
      this.cleanup();
      return;
    }

    this.selectedMimeType = pickSupportedAudioMimeType();
    const options: MediaRecorderOptions = this.selectedMimeType
      ? { mimeType: this.selectedMimeType }
      : {};

    this.recorder = new MediaRecorder(this.stream, options);
    this.chunks = [];

    this.recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.startedAt = Date.now();
    this.recorder.start(200);
    this.startVisualizer(this.stream);

    this.timerId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
      this.callbacks.onDurationTick?.(elapsed);
      if (elapsed >= MAX_VOICE_DURATION_SEC) {
        this.callbacks.onMaxDurationReached?.();
      }
    }, 250);
  }

  private startVisualizer(stream: MediaStream): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);

      const bins = new Uint8Array(analyser.frequencyBinCount);
      const barCount = 12;

      const tick = () => {
        if (this.isDisposed) return;
        analyser.getByteFrequencyData(bins);

        const levels: number[] = [];
        for (let i = 0; i < barCount; i++) {
          const binIdx = Math.min(bins.length - 1, i + 1);
          const norm = Math.min(1, Math.max(0.12, bins[binIdx] / 210));
          levels.push(norm);
        }
        this.callbacks.onLevels?.(levels);
        this.rafId = window.requestAnimationFrame(tick);
      };

      this.rafId = window.requestAnimationFrame(tick);
    } catch {
      // Visualizer is optional; recording continues cleanly without it
    }
  }

  /**
   * Stop recording and resolve with encoded audio payload.
   */
  stop(): Promise<RecordedVoiceResult> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === 'inactive') {
        this.cleanup();
        reject(new Error('RECORDER_INACTIVE'));
        return;
      }

      const elapsedSec = Math.max(0.1, (Date.now() - this.startedAt) / 1000);

      recorder.onstop = async () => {
        try {
          const rawMime = recorder.mimeType || this.selectedMimeType || 'audio/webm';
          const mimeType = normalizeAudioMimeType(rawMime);
          const blob = new Blob(this.chunks, { type: mimeType });
          this.cleanup();

          if (elapsedSec < 0.45 || blob.size < 800) {
            reject(new Error('TOO_SHORT'));
            return;
          }

          const base64 = await blobToBase64(blob);
          resolve({
            blob,
            base64,
            mimeType,
            durationSec: Math.round(elapsedSec),
          });
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      recorder.onerror = () => {
        this.cleanup();
        reject(new Error('RECORD_FAILED'));
      };

      try {
        recorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Abort recording and immediately release hardware microphone tracks.
   */
  cancel(): void {
    this.isDisposed = true;
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.onstop = null;
        this.recorder.ondataavailable = null;
        this.recorder.stop();
      }
    } catch {
      // ignore
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.recorder = null;
    this.chunks = [];
  }
}
