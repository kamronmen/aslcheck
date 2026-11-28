import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  RefreshCw,
  Trash2,
  User,
  CheckCircle2,
  Mic,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
} from 'lucide-react';
import { AiCoreIcon, VerifiedSealIcon } from './Icons';
import { UzbekGirihPattern } from './UzbekGirihPattern';
import { AudioPlayerButton } from './AudioPlayerButton';
import { askAiAssistant, askAiWithVoice, type ChatMessage } from '../lib/ai';
import {
  playTextToSpeech,
  prepareAudioPlaybackGesture,
  stopCurrentAudio,
} from '../lib/tts';
import {
  VoiceRecorderSession,
  MAX_VOICE_DURATION_SEC,
} from '../lib/voiceRecorder';

interface AiExpertPageProps {
  initialQuestion?: string;
  onClearInitialQuestion?: () => void;
}

const DEFAULT_SUGGESTIONS = [
  "Asalning tabiiy yoki sun'iy ekanligini qanday tekshirish mumkin?",
  "Qora sedana yog‘i sifatini qadoqdan qanday aniqlash mumkin?",
  "AslCheck Anti-Clone algoritmi nusxa ko'chirishdan qanday himoya qiladi?",
  "Oziq-ovqat qadog‘idagi E211 va E250 qo‘shimchalari xavflimi?",
  "Dori yoki vitaminlarning soxtasini ajratish bo‘yicha 3 ta amaliy qoida",
];

export const AiExpertPage: React.FC<AiExpertPageProps> = ({
  initialQuestion,
  onClearInitialQuestion,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: `Assalomu alaykum! Men **AslCheck Yordamchi** — mahsulotlar sifati, tarkibi va kontrafaktdan himoyalanish bo‘yicha rasmiy tahlilchiman.

Quyidagi masalalarda aniq yordam bera olaman:
• Qadoqdagi tarkib va E-qo‘shimchalar (allergenlar, konservantlar) tahlili
• Asal, yog‘, choy va dorivor giyohlarning soxtasini aniqlash mezonlari
• AslCheck QR pasporti va seriya raqamlari qanday ishlashi
• Muddati o‘tgan yoki klonlangan mahsulot aniqlanganda ko‘riladigan choralar

Savolingizni yozing, mikrofonga gapiring yoki quyidagi tayyor so‘rovlardan birini tanlang. Har bir javobni pastdagi karnay tugmasi orqali ovozli eshitishingiz mumkin.`,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [voiceLevels, setVoiceLevels] = useState<number[]>(() => Array(12).fill(0.18));
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<VoiceRecorderSession | null>(null);
  const autoStopRef = useRef<() => void>(() => {});
  const lastInitialQuestionRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(
    async (textToSend: string) => {
      const trimmed = textToSend.trim();
      if (!trimmed || isLoading) return;

      if (autoSpeak) {
        prepareAudioPlaybackGesture();
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setVoiceError(null);
      setIsLoading(true);

      try {
        const history = messages
          .filter((m) => m.id !== 'msg-welcome')
          .map((m) => ({ role: m.role, text: m.text }));

        const replyText = await askAiAssistant(trimmed, history);

        const aiId = `ai-${Date.now()}`;
        const aiMessage: ChatMessage = {
          id: aiId,
          role: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, aiMessage]);

        if (autoSpeak && replyText) {
          void playTextToSpeech(replyText, `chat-msg-${aiId}`, { skipGestureUnlock: true });
        }
      } catch (err) {
        console.error('AI chat error:', err);
        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: "Kechirasiz, javob olishda uzilish yuz berdi. Iltimos, qaytadan urinib ko'ring.",
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [isLoading, messages, autoSpeak]
  );

  const handleStopAndSendVoice = useCallback(async () => {
    const session = recorderRef.current;
    if (!session) return;

    // Unlock mobile HTMLAudioElement synchronously inside the tap gesture
    prepareAudioPlaybackGesture();
    recorderRef.current = null;
    setIsRecording(false);
    setRecordingSec(0);
    setVoiceLevels(Array(12).fill(0.18));

    let recorded;
    try {
      recorded = await session.stop();
    } catch (err: any) {
      if (err?.message === 'TOO_SHORT') {
        setVoiceError('Ovoz juda qisqa. Tugmani bosib kamida 1 soniya gapiring.');
      } else {
        setVoiceError('Ovoz yozuvini saqlab bo‘lmadi. Qaytadan urinib ko‘ring.');
      }
      return;
    }

    const pendingId = `voice-pending-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    setVoiceError(null);
    setMessages((prev) => [
      ...prev,
      {
        id: pendingId,
        role: 'user',
        text: 'Ovozli savol tinglanmoqda...',
        timestamp: nowTime,
        isVoice: true,
        durationSec: recorded.durationSec,
      },
    ]);
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'msg-welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const { transcript, reply } = await askAiWithVoice({
        audioBase64: recorded.base64,
        mimeType: recorded.mimeType,
        history,
      });

      const finalTranscript = transcript || `Ovozli savol (${recorded.durationSec}s)`;
      const aiId = `ai-${Date.now()}`;
      const replyTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

      setMessages((prev) => [
        ...prev.map((m) => (m.id === pendingId ? { ...m, text: finalTranscript } : m)),
        {
          id: aiId,
          role: 'assistant',
          text: reply,
          timestamp: replyTime,
        },
      ]);

      // Spoken interaction always speaks back in natural Uzbek AI voice
      if (reply) {
        void playTextToSpeech(reply, `chat-msg-${aiId}`, { skipGestureUnlock: true });
      }
    } catch (err) {
      console.error('Voice AI error:', err);
      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === pendingId ? { ...m, text: `Ovozli savol (${recorded.durationSec}s)` } : m
        ),
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: "Ovozli savolga javob berishda uzilish yuz berdi. Iltimos, qaytadan urinib ko'ring.",
          timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    autoStopRef.current = () => {
      void handleStopAndSendVoice();
    };
  }, [handleStopAndSendVoice]);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
    };
  }, []);

  const handleStartVoiceRecording = async () => {
    if (isLoading || isRecording) return;

    // Prevent recording AI's own voice output
    stopCurrentAudio();
    prepareAudioPlaybackGesture();
    setVoiceError(null);
    setRecordingSec(0);
    setVoiceLevels(Array(12).fill(0.2));

    const session = new VoiceRecorderSession({
      onLevels: (levels) => setVoiceLevels(levels),
      onDurationTick: (sec) => setRecordingSec(sec),
      onMaxDurationReached: () => autoStopRef.current(),
    });

    recorderRef.current = session;
    try {
      await session.start();
      setIsRecording(true);
    } catch (err: any) {
      session.cancel();
      recorderRef.current = null;
      setIsRecording(false);

      if (err?.message === 'UNSUPPORTED_BROWSER') {
        setVoiceError('Ushbu brauzer ovoz yozishni qo‘llab-quvvatlamaydi.');
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setVoiceError('Mikrofon ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering.');
      } else if (err?.name === 'NotFoundError') {
        setVoiceError('Mikrofon qurilmasi topilmadi.');
      } else {
        setVoiceError('Mikrofonni ishga tushirib bo‘lmadi. Qaytadan urinib ko‘ring.');
      }
    }
  };

  const handleCancelVoiceRecording = () => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setIsRecording(false);
    setRecordingSec(0);
    setVoiceLevels(Array(12).fill(0.18));
  };

  const handleToggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    if (next) {
      prepareAudioPlaybackGesture();
    } else {
      stopCurrentAudio();
    }
  };

  useEffect(() => {
    const trimmed = initialQuestion?.trim();
    if (!trimmed || lastInitialQuestionRef.current === trimmed) return;
    lastInitialQuestionRef.current = trimmed;

    const timer = window.setTimeout(() => {
      void handleSendMessage(trimmed);
      onClearInitialQuestion?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialQuestion, handleSendMessage, onClearInitialQuestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleClearHistory = () => {
    handleCancelVoiceRecording();
    stopCurrentAudio();
    setVoiceError(null);
    setMessages([
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: 'Muloqot tozalandi. Mahsulotlar haqiqiyligi, tarkibi yoki xavfsizligi bo‘yicha yangi savolingiz bormi?',
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const renderInlineTokens = (str: string): React.ReactNode[] => {
    const tokens = str.split(/(\*\*.*?\*\*|\*[^*]+?\*)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return (
          <strong key={idx} className="text-[#FAFAFA] font-semibold">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return (
          <em key={idx} className="text-[#CCCCCC] not-italic">
            {token.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={idx}>{token}</React.Fragment>;
    });
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.replace(/^([•\-*]\s*)/, '');
            return (
              <div key={idx} className="flex items-start space-x-2 pl-1">
                <span className="text-zinc-400 font-bold text-xs mt-0.5">•</span>
                <span>{renderInlineTokens(content)}</span>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            return (
              <div key={idx} className="pl-1">
                {renderInlineTokens(trimmed)}
              </div>
            );
          }

          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-semibold text-[#FAFAFA] text-sm pt-1">
                {renderInlineTokens(trimmed.replace('### ', ''))}
              </h4>
            );
          }

          return <p key={idx}>{renderInlineTokens(trimmed)}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden bg-black">
      <UzbekGirihPattern />
      <div className="relative mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6 flex flex-col h-[calc(100dvh-4rem)] min-h-[calc(100dvh-130px)] max-h-[920px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3.5 border-b border-[#18181B]">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[#1F1F23] bg-[#0A0A0C] text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.12)] shrink-0">
            <AiCoreIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-lg font-semibold tracking-tight">
                <span className="text-white">AslCheck Yordamchi</span>{' '}
                <span className="text-[#71717A]">• Aqlli tahlil</span>
              </h1>
              <span className="inline-flex items-center space-x-1 rounded-full border border-[#1F1F23] bg-[#0A0A0C] px-2 py-0.5 text-[9px] sm:text-[10px] font-mono text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.85)] animate-pulse" />
                <span>FAOL</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#71717A] truncate">
              Mahsulotlar sifati, tarkibi va kontrafaktga qarshi ovozli tahlilchi
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleToggleAutoSpeak}
            title={
              autoSpeak
                ? 'Yozma savollarga ham avtomatik ovozli javob yoqilgan'
                : 'Avtomatik ovozli javobni yoqish'
            }
            className={`flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors min-h-[34px] ${
              autoSpeak
                ? 'border-indigo-400/40 bg-indigo-500/10 text-indigo-300'
                : 'border-[#1F1F23] bg-[#0A0A0C] text-[#71717A] hover:text-white hover:border-[#27272A]'
            }`}
          >
            {autoSpeak ? (
              <Volume2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            ) : (
              <VolumeX className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            )}
            <span>Avto-ovoz</span>
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            title="Muloqot tarixini tozalash"
            className="flex items-center space-x-1.5 rounded-lg border border-[#1F1F23] bg-[#0A0A0C] px-2.5 py-1.5 text-xs text-[#71717A] hover:text-white hover:border-[#27272A] transition-colors min-h-[34px]"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Tozalash</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="py-2.5 overflow-x-auto no-scrollbar flex items-center space-x-2 border-b border-[#18181B]">
        <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] text-[#71717A] shrink-0 font-mono uppercase tracking-wider">
          <AiCoreIcon className="h-3 w-3 text-indigo-400" strokeWidth={1.5} />
          <span>Tezkor:</span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(suggestion)}
              className="rounded-full border border-[#1F1F23] bg-[#0A0A0C] px-3 py-1 text-[11px] text-[#A1A1AA] hover:text-white hover:border-[#27272A] hover:bg-[#141418] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 sm:pr-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2 sm:space-x-3 ${
                isUser ? 'flex-row-reverse space-x-reverse' : ''
              } animate-in fade-in duration-200`}
            >
              <div
                className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border text-xs ${
                  isUser
                    ? 'border-[#27272A] bg-[#141418] text-white'
                    : 'border-[#1F1F23] bg-[#0A0A0C] text-indigo-400'
                }`}
              >
                {isUser ? (
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
                ) : (
                  <AiCoreIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
                )}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 break-words ${
                  isUser
                    ? 'border border-[#27272A] bg-[#141418] text-white rounded-tr-sm shadow-sm text-xs sm:text-sm'
                    : 'relative overflow-hidden border border-[#1F1F23] border-t-white/[0.08] bg-[#0A0A0C] text-[#A1A1AA] rounded-tl-sm shadow-[0_14px_35px_rgba(0,0,0,0.75)] text-xs sm:text-sm'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#18181B]">
                    <span className="font-semibold text-xs text-white flex items-center space-x-1.5">
                      <span>AslCheck Yordamchi</span>
                      <VerifiedSealIcon className="h-3 w-3 text-indigo-400" strokeWidth={1.75} />
                    </span>
                    <span className="text-[10px] text-[#71717A] font-mono">{msg.timestamp}</span>
                  </div>
                )}

                {isUser ? (
                  <div className="leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.text}
                  </div>
                ) : (
                  <>
                    {renderFormattedText(msg.text)}

                    {/* Audio reader button in assistant bubble */}
                    <div className="mt-2.5 pt-2 border-t border-[#18181B] flex items-center justify-between">
                      <span className="text-[10px] text-[#71717A] font-mono">
                        AslCheck Yordamchi • Ovozli javob
                      </span>
                      <AudioPlayerButton
                        text={msg.text}
                        id={`chat-msg-${msg.id}`}
                        variant="compact"
                        label="Ovozli eshitish"
                      />
                    </div>
                  </>
                )}

                {isUser && (
                  <div className="mt-1.5 flex items-center justify-end space-x-2 text-[10px] text-[#71717A] font-mono">
                    {msg.isVoice && (
                      <span className="inline-flex items-center space-x-1 text-[#A1A1AA]">
                        <Mic className="h-2.5 w-2.5 text-indigo-400" strokeWidth={2} />
                        <span>
                          Ovozli savol{typeof msg.durationSec === 'number' ? ` · ${msg.durationSec}s` : ''}
                        </span>
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start space-x-2 sm:space-x-3 animate-in fade-in">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F1F23] bg-[#0A0A0C] text-indigo-400">
              <AiCoreIcon className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.75} />
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-[#1F1F23] bg-[#0A0A0C] p-3 text-xs text-[#A1A1AA] shadow-sm flex items-center space-x-2">
              <span className="text-[#A1A1AA]">Tahlil qilinmoqda</span>
              <span className="flex space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="pt-2.5 border-t border-[#18181B] bg-black/90 space-y-1.5">
        {voiceError && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-1.5 text-[11px] text-[#FCA5A5]">
            <span className="flex items-center space-x-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-[#EF4444] shrink-0" strokeWidth={1.75} />
              <span>{voiceError}</span>
            </span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              aria-label="Xabarni yopish"
              className="text-[#71717A] hover:text-white p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-indigo-400/40 bg-[#0A0A0C] px-3 py-2 min-h-[48px] shadow-[0_0_28px_rgba(99,102,241,0.14)]">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EF4444]" />
              </span>
              <span className="font-mono text-xs font-semibold text-white tabular-nums">
                {formatTimer(recordingSec)}
                <span className="hidden sm:inline text-[#71717A] font-normal">
                  {' '}
                  / {formatTimer(MAX_VOICE_DURATION_SEC)}
                </span>
              </span>
              <span className="hidden sm:inline text-xs text-indigo-300">Gapiring...</span>
            </div>

            {/* Live Frequency Spectrum Bars (Gemini AI Violet-Blue Waveform) */}
            <div className="flex items-center justify-center gap-1 h-7 flex-1 max-w-[180px]" aria-hidden="true">
              {voiceLevels.map((lvl, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(4, Math.round(lvl * 24))}px` }}
                  className="w-1 rounded-full bg-gradient-to-t from-blue-500 via-indigo-400 to-violet-300 shadow-[0_0_8px_rgba(129,140,248,0.5)] transition-[height] duration-75"
                />
              ))}
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCancelVoiceRecording}
                title="Ovoz yozishni bekor qilish"
                aria-label="Bekor qilish"
                className="flex items-center justify-center rounded-lg border border-[#27272A] bg-black px-2.5 py-2 text-xs text-[#A1A1AA] hover:text-white hover:border-zinc-500 transition-colors min-h-[36px] min-w-[36px]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => void handleStopAndSendVoice()}
                className="flex items-center space-x-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-[#F4F4F5] transition-colors shadow-[0_0_20px_rgba(255,255,255,0.18)] min-h-[36px]"
              >
                <span>Yuborish</span>
                <Send className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1.5 rounded-xl border border-[#1F1F23] bg-[#0A0A0C] p-1.5 focus-within:border-white/30 transition-all shadow-[0_12px_32px_rgba(0,0,0,0.85)]"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Savol yozing..."
              disabled={isLoading}
              className="flex-1 min-w-0 bg-transparent px-3 py-2 text-base sm:text-sm text-white placeholder-[#52525B] focus:outline-none min-h-[38px]"
            />
            <button
              type="button"
              onClick={() => void handleStartVoiceRecording()}
              disabled={isLoading}
              title="Mikrofon orqali o‘zbekcha ovozli savol berish"
              aria-label="Ovozli savol berish"
              className="flex items-center justify-center rounded-lg border border-[#27272A] bg-black/60 px-2.5 py-2 text-indigo-300 hover:text-white hover:border-indigo-400/50 disabled:opacity-30 transition-colors min-h-[38px] min-w-[38px] shrink-0"
            >
              <Mic className="h-4 w-4" strokeWidth={1.85} />
            </button>
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="flex items-center space-x-1.5 rounded-lg bg-white px-3.5 sm:px-4 py-2 text-xs font-semibold text-black hover:bg-[#F4F4F5] disabled:opacity-30 transition-all shadow-[0_0_20px_rgba(255,255,255,0.18)] min-h-[38px] shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <>
                  <span>Yuborish</span>
                  <Send className="h-3 w-3" strokeWidth={2} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#71717A] px-1">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-3 w-3 text-indigo-400 shrink-0" strokeWidth={1.75} />
            <span className="truncate">
              Ovozli savol bering — AslCheck Yordamchi tinglab o‘zbek tilida javob beradi
            </span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-[#71717A]">
            Gemini 2.5 • AslCheck Yordamchi
          </span>
        </div>
      </div>
      </div>
    </div>
  );
};
