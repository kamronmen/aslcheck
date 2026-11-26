import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { playTextToSpeech, stopCurrentAudio, type AudioPlayState } from '../lib/tts';

interface AudioPlayerButtonProps {
  text: string;
  id?: string;
  variant?: 'compact' | 'pill' | 'card';
  label?: string;
  className?: string;
}

export const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({
  text,
  id,
  variant = 'pill',
  label = 'Ovozli eshitish',
  className = '',
}) => {
  const [playState, setPlayState] = useState<AudioPlayState>('idle');
  const playerId = React.useMemo(
    () => id || `tts-${Math.random().toString(36).slice(2, 9)}`,
    [id]
  );

  useEffect(() => {
    return () => {
      // Cleanup on unmount if this button was playing
      if (playState === 'playing' || playState === 'loading') {
        stopCurrentAudio();
      }
    };
  }, [playState]);

  const handleTogglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (playState === 'playing' || playState === 'loading') {
      stopCurrentAudio();
      setPlayState('idle');
      return;
    }

    await playTextToSpeech(text, playerId, (state) => {
      setPlayState(state);
    });
  };

  // 1. Compact variant (icon only for chat bubbles and tight spaces)
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleTogglePlay}
        title={playState === 'playing' ? 'Ovozni to‘xtatish' : label}
        className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors ${
          playState === 'playing'
            ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
            : playState === 'loading'
            ? 'bg-[#1A1A1A] text-[#FAFAFA] border border-[#2A2A2A]'
            : 'text-[#888888] hover:text-[#FAFAFA] hover:bg-[#141414]'
        } ${className}`}
      >
        {playState === 'loading' ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-300" strokeWidth={2} />
        ) : playState === 'playing' ? (
          <div className="flex items-center space-x-1">
            <span className="flex items-end space-x-0.5 h-3">
              <span className="w-0.5 h-2 bg-[#10B981] animate-pulse" />
              <span className="w-0.5 h-3 bg-[#10B981] animate-pulse [animation-delay:0.15s]" />
              <span className="w-0.5 h-1.5 bg-[#10B981] animate-pulse [animation-delay:0.3s]" />
            </span>
            <VolumeX className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={2} />
          </div>
        ) : (
          <Volume2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </button>
    );
  }

  // 2. Pill variant (default, button with text)
  return (
    <button
      type="button"
      onClick={handleTogglePlay}
      className={`inline-flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
        playState === 'playing'
          ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40 shadow-sm'
          : playState === 'loading'
          ? 'bg-[#1A1A1A] text-[#FAFAFA] border border-[#2E2E2E]'
          : 'border border-[#262626] bg-[#111111] text-[#FAFAFA] hover:bg-[#1A1A1A] hover:border-[#383838]'
      } ${className}`}
    >
      {playState === 'loading' ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-300" strokeWidth={2} />
          <span className="text-[11px]">Tayyorlanmoqda...</span>
        </>
      ) : playState === 'playing' ? (
        <>
          <span className="flex items-end space-x-0.5 h-3">
            <span className="w-0.5 h-2 bg-[#10B981] animate-pulse" />
            <span className="w-0.5 h-3 bg-[#10B981] animate-pulse [animation-delay:0.15s]" />
            <span className="w-0.5 h-1.5 bg-[#10B981] animate-pulse [animation-delay:0.3s]" />
          </span>
          <span className="text-[11px] font-semibold">To‘xtatish</span>
          <VolumeX className="h-3 w-3 text-[#10B981]" strokeWidth={2} />
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5 text-zinc-300" strokeWidth={1.75} />
          <span className="text-[11px]">{label}</span>
        </>
      )}
    </button>
  );
};
