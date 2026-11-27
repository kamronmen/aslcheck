import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Download,
  Presentation,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Factory,
  ShieldCheck,
  Film,
} from 'lucide-react';
import { PRESENTATION_URL } from './Navbar';
import { stopCurrentAudio } from '../lib/tts';

interface VideoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Chapter {
  time: number;
  label: string;
  icon: React.ReactNode;
}

const CHAPTERS: Chapter[] = [
  {
    time: 0,
    label: 'Kirish & Bosh sahifa',
    icon: <ShieldCheck className="h-3 w-3 text-zinc-400" />,
  },
  {
    time: 12,
    label: '100% Asl Pasport',
    icon: <CheckCircle2 className="h-3 w-3 text-zinc-400" />,
  },
  {
    time: 26,
    label: 'AslCheck Yordamchi',
    icon: <Sparkles className="h-3 w-3 text-zinc-400" />,
  },
  {
    time: 38,
    label: 'Anti-Klon Ogohlantirish',
    icon: <AlertTriangle className="h-3 w-3 text-zinc-400" />,
  },
  {
    time: 50,
    label: 'B2B QR Generator',
    icon: <Factory className="h-3 w-3 text-zinc-400" />,
  },
];

export const VideoGuideModal: React.FC<VideoGuideModalProps> = ({ isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Stop any background TTS audio when opening video modal
  useEffect(() => {
    if (isOpen) {
      stopCurrentAudio();
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      void videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-2xl border border-[#1F1F23] bg-[#0A0A0C] shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F1F23] px-4 py-3 sm:px-6 sm:py-3.5 bg-[#0A0A0C]">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-[#1F1F23] bg-black/60 text-zinc-300">
              <Film className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="video-guide-title"
                className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-1.5"
              >
                <span>Ishlatish Yo‘riqnomasi</span>
                <span className="rounded bg-black/60 border border-[#1F1F23] px-1.5 py-0.2 text-[9px] font-mono text-[#71717A]">
                  16:9 HD
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-[#71717A]">
                AslCheck PRO platformasining to‘liq imkoniyatlari bo‘yicha rasmiy video
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-[#71717A] hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Video Canvas (16:9 Aspect Ratio Container) */}
        <div className="relative bg-black w-full aspect-video flex items-center justify-center overflow-hidden border-b border-[#1F1F23]">
          <video
            ref={videoRef}
            src="/aslcheck-pro-demo-16x9.mp4"
            poster="/video-poster.jpg"
            controls
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-contain"
          >
            Brauzeringiz video tegini qo‘llab-quvvatlamaydi.
          </video>
        </div>

        {/* Interactive Chapters Strip */}
        <div className="bg-[#0A0A0C] p-3 sm:p-4 border-b border-[#1F1F23] overflow-x-auto scrollbar-thin">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-mono text-[#71717A] flex items-center gap-1">
              <Play className="h-2.5 w-2.5 text-zinc-400" /> Bo‘limlar bo‘yicha o‘tish:
            </span>
            <span className="text-[10px] font-mono text-[#71717A]">
              {Math.floor(currentTime / 60)}:
              {String(Math.floor(currentTime % 60)).padStart(2, '0')} / 1:11
            </span>
          </div>

          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2">
            {CHAPTERS.map((ch) => {
              const isActive = currentTime >= ch.time && currentTime < ch.time + 12;
              return (
                <button
                  key={ch.time}
                  type="button"
                  onClick={() => handleSeek(ch.time)}
                  className={`inline-flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all shrink-0 ${
                    isActive
                      ? 'border border-white/40 bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                      : 'border border-[#1F1F23] bg-black/60 text-[#71717A] hover:border-[#27272A] hover:text-white'
                  }`}
                >
                  {ch.icon}
                  <span>{ch.label}</span>
                  <span className="text-[9px] font-mono text-zinc-600">
                    {String(Math.floor(ch.time / 60))}:{String(ch.time % 60).padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-[#0A0A0C] border-t border-[#1F1F23] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2 text-[#71717A] text-[11px]">
            <span>Ovoz: Gemini AI O‘zbekcha diktor</span>
            <span>•</span>
            <span>1920x1080 Full HD</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <a
              href="/aslcheck-pro-demo-16x9.mp4"
              download="aslcheck-pro-demo-16x9.mp4"
              className="inline-flex items-center justify-center space-x-1.5 rounded-lg border border-[#27272A] bg-black/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:bg-black/90 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
              <span>Videoni yuklab olish</span>
            </a>

            <a
              href={PRESENTATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-1.5 rounded-lg border border-[#27272A] bg-black/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:bg-black/90 hover:text-white transition-colors"
            >
              <Presentation className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
              <span>Taqdimot</span>
              <ArrowUpRight className="h-3 w-3 text-zinc-500" strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
