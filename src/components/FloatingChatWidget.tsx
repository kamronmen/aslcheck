import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  RefreshCw,
  User,
  ChevronDown,
} from 'lucide-react';
import { AiCoreIcon, VerifiedSealIcon } from './Icons';
import { askAiAssistant, type ChatMessage } from '../lib/ai';

const QUICK_QUESTIONS = [
  'AslCheck sayti qanday ishlaydi?',
  'QR-kodni qanday tekshiraman?',
  'Anti-Clone tizimi nima?',
  'Ishlab chiqaruvchilar qanday ulanadi?',
  'Soxta mahsulot topsam nima qilishim kerak?',
];

export const FloatingChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Assalomu alaykum! Men **AslCheck AI Yordamchi**man.

Saytdan foydalanish, QR-kod skaneri, AI Vizual Ekspertiza, Anti-Clone himoyasi yoki mahsulotlar haqiqiyligi bo‘yicha istalgan savolingizni bering.`,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const siteContext = `Foydalanuvchi AslCheck veb-platformasida turibdi. Sayt funksiyalari (QR skaner, AI Vizual Ekspertiza, kod orqali tekshirish, mahsulot pasporti, xaridni band qilish, kontrafakt haqida shikoyat berish, ishlab chiqaruvchilar avtorizatsiyasi, partiyali QR chiqarish) bo'yicha yordam bering.`;

      const replyText = await askAiAssistant(trimmed, history, siteContext);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err) {
      console.error('Floating AI error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: 'Uzr, javob berishda texnik nosozlik yuz berdi. Iltimos qaytadan yozib ko‘ring.',
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: 'Muloqot tozalandi. Sayt yoki mahsulotlar bo‘yicha qanday savolingiz bor?',
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-xs leading-relaxed">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-1" />;
          if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const clean = trimmed.replace(/^([•\-*]\s*)/, '');
            return (
              <div key={i} className="flex items-start space-x-1.5 pl-0.5">
                <span className="text-[#10B981] font-bold text-[11px]">•</span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: clean
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(
                        /\*\*(.*?)\*\*/g,
                        '<strong class="text-[#FAFAFA] font-semibold">$1</strong>'
                      ),
                  }}
                />
              </div>
            );
          }
          return (
            <p
              key={i}
              dangerouslySetInnerHTML={{
                __html: trimmed
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="text-[#FAFAFA] font-semibold">$1</strong>'
                  ),
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* 1. FLOATING CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[380px] md:w-[410px] h-[520px] max-h-[82vh] rounded-2xl border border-[#222222] bg-[#0A0A0A] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-[#1F1F1F] bg-[#050505] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#1F1F1F] bg-[#111111] text-[#FAFAFA]">
                <AiCoreIcon className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold text-[#FAFAFA] tracking-tight">
                    AslCheck AI Yordamchi
                  </h3>
                  <span className="rounded bg-[#10B981]/15 border border-[#10B981]/30 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-[#10B981]">
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-[#888888]">Sayt va mahsulotlar bo‘yicha konsultatsiya</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Tarixni tozalash"
                className="p-1.5 text-[#888888] hover:text-[#FAFAFA] hover:bg-[#141414] rounded-md transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Yopish"
                className="p-1.5 text-[#888888] hover:text-[#FAFAFA] hover:bg-[#141414] rounded-md transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Strip */}
          <div className="px-3 py-2 bg-[#080808] border-b border-[#141414] overflow-x-auto no-scrollbar flex items-center space-x-1.5">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(q)}
                className="rounded-full border border-[#1F1F1F] bg-[#0E0E0E] px-2.5 py-1 text-[10px] text-[#888888] hover:text-[#FAFAFA] hover:border-[#333333] hover:bg-[#161616] whitespace-nowrap transition-colors shrink-0 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2 ${
                    isUser ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-md flex shrink-0 items-center justify-center text-[10px] border ${
                      isUser
                        ? 'border-[#2E2E2E] bg-[#1A1A1A] text-[#FAFAFA]'
                        : 'border-[#1F1F1F] bg-[#0E0E0E] text-[#10B981]'
                    }`}
                  >
                    {isUser ? (
                      <User className="h-3 w-3" strokeWidth={2} />
                    ) : (
                      <AiCoreIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl p-2.5 sm:p-3 text-xs ${
                      isUser
                        ? 'border border-[#2E2E2E] bg-[#161616] text-[#FAFAFA] rounded-tr-none'
                        : 'border border-[#1F1F1F] bg-[#0E0E0E] text-[#A0A0A0] rounded-tl-none'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : (
                      renderMessageContent(msg.text)
                    )}

                    <div
                      className={`mt-1 text-[9px] font-mono text-[#525252] ${
                        isUser ? 'text-right' : 'text-left'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start space-x-2">
                <div className="h-6 w-6 rounded-md flex shrink-0 items-center justify-center border border-[#1F1F1F] bg-[#0E0E0E] text-[#10B981]">
                  <AiCoreIcon className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                </div>
                <div className="rounded-xl rounded-tl-none border border-[#1F1F1F] bg-[#0E0E0E] p-2.5 text-xs text-[#888888] flex items-center space-x-1.5">
                  <span>Javob tayyorlanmoqda</span>
                  <span className="flex space-x-1">
                    <span className="h-1 w-1 rounded-full bg-[#10B981] animate-bounce" />
                    <span className="h-1 w-1 rounded-full bg-[#10B981] animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1 w-1 rounded-full bg-[#10B981] animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-[#1F1F1F] bg-[#050505]">
            <form onSubmit={handleFormSubmit} className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Sayt yoki mahsulot haqida so‘rang..."
                disabled={isLoading}
                className="w-full rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] py-2.5 pl-3 pr-16 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-1 flex items-center justify-center rounded-lg bg-[#FAFAFA] p-1.5 text-black hover:bg-[#E5E5E5] disabled:opacity-30 transition-colors"
                title="Yuborish"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-[#525252] px-1">
              <span className="flex items-center space-x-1">
                <VerifiedSealIcon className="h-2.5 w-2.5 text-[#10B981]" strokeWidth={1.75} />
                <span>AslCheck rasmiy AI yordamchisi</span>
              </span>
              <span className="font-mono">Enter</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING TRIGGER BUTTON */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group relative flex items-center space-x-2 rounded-full border px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-2xl transition-all duration-200 active:scale-95 ${
            isOpen
              ? 'border-[#FAFAFA] bg-[#FAFAFA] text-black font-semibold'
              : 'border-[#262626] bg-[#0A0A0A] text-[#FAFAFA] hover:border-[#444444] hover:bg-[#121212]'
          }`}
          aria-label="AI Yordamchini ochish"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
          </span>

          {isOpen ? (
            <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <AiCoreIcon className="h-4 w-4 text-[#10B981]" strokeWidth={1.75} />
          )}

          <span className="text-xs font-semibold tracking-tight">
            {isOpen ? 'Yopish' : 'AI Yordamchi'}
          </span>

          {!isOpen && hasUnread && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#EF4444]" />
            </span>
          )}
        </button>
      </div>
    </>
  );
};
