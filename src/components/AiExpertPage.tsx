import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Trash2,
  Bot,
  User,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { askAiAssistant, type ChatMessage } from '../lib/ai';

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
        text: `Assalomu alaykum! Men **AslCheck AI Ekspert** — mahsulotlar sifati, tabiiyligi va kontrafaktdan himoyalanish bo‘yicha rasmiy intellektual maslahatchiman (Google Gemini 3.5 Flash asosida).

Quyidagi masalalarda yordam bera olaman:
• Qadoqdagi tarkib va E-qo‘shimchalar (allergenlar, konservantlar) tahlili
• Asal, yog‘, choy va dorivor giyohlarning soxtasini aniqlash usullari
• AslCheck QR pasporti va seriya raqamlari qanday ishlashi
• Sotib olingan mahsulot yaroqlilik muddati o‘tganda nima qilish kerakligi

Istalgan savolingizni yozing yoki quyidagi tayyor savollardan birini tanlang.`,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle incoming initialQuestion (e.g. from verification card)
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      handleSendMessage(initialQuestion.trim());
      if (onClearInitialQuestion) {
        onClearInitialQuestion();
      }
    }
  }, [initialQuestion]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build history for multi-turn Gemini conversation
      const history = messages
        .filter((m) => m.id !== 'msg-welcome')
        .map((m) => ({ role: m.role, text: m.text }));

      const replyText = await askAiAssistant(trimmed, history);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: `Muloqot tozalandi. Mahsulotlar haqiqiyligi, tarkibi yoki xavfsizligi bo‘yicha yangi savolingiz bormi?`,
        timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Helper to format AI markdown-like text nicely
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet points
          if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.replace(/^([•\-*]\s*)/, '');
            return (
              <div key={idx} className="flex items-start space-x-2 pl-1">
                <span className="text-[#10B981] font-bold text-xs mt-0.5">•</span>
                <span dangerouslySetInnerHTML={{ __html: parseBold(content) }} />
              </div>
            );
          }

          // Numbered list
          if (/^\d+\.\s/.test(trimmed)) {
            return (
              <div
                key={idx}
                className="pl-1"
                dangerouslySetInnerHTML={{ __html: parseBold(trimmed) }}
              />
            );
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h4
                key={idx}
                className="font-semibold text-[#FAFAFA] text-sm pt-1"
                dangerouslySetInnerHTML={{ __html: parseBold(trimmed.replace('### ', '')) }}
              />
            );
          }

          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: parseBold(trimmed) }} />
          );
        })}
      </div>
    );
  };

  // Simple safe bold parser for **bold text**
  const parseBold = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#FAFAFA] font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-[#CCCCCC]">$1</em>');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 flex flex-col h-[calc(100vh-4rem)] max-h-[920px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#1F1F1F]">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] text-[#FAFAFA] shadow-inner">
            <Sparkles className="h-5 w-5 text-[#FAFAFA]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#FAFAFA]">
                AslCheck AI Ekspert
              </h1>
              <span className="inline-flex items-center space-x-1 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>Gemini 3.5</span>
              </span>
            </div>
            <p className="text-xs text-[#888888]">
              Mahsulotlar sifati, tarkibi va kontrafaktga qarshi intellektual tahlilchi
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleClearHistory}
            title="Muloqot tarixini tozalash"
            className="flex items-center space-x-1.5 rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-[#888888] hover:text-[#FAFAFA] hover:bg-[#141414] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Tozalash</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="py-3 overflow-x-auto no-scrollbar flex items-center space-x-2 border-b border-[#141414]">
        <div className="flex items-center space-x-1 text-[11px] text-[#525252] shrink-0 font-medium">
          <Lightbulb className="h-3 w-3 text-[#F59E0B]" strokeWidth={2} />
          <span>Mashhur savollar:</span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(suggestion)}
              className="rounded-full border border-[#1F1F1F] bg-[#0A0A0A] px-2.5 py-1 text-[11px] text-[#888888] hover:text-[#FAFAFA] hover:border-[#333333] hover:bg-[#141414] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 sm:pr-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 sm:space-x-3 ${
                isUser ? 'flex-row-reverse space-x-reverse' : ''
              } animate-in fade-in duration-200`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs ${
                  isUser
                    ? 'border-[#2E2E2E] bg-[#1A1A1A] text-[#FAFAFA]'
                    : 'border-[#1F1F1F] bg-[#0A0A0A] text-[#10B981]'
                }`}
              >
                {isUser ? (
                  <User className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Bot className="h-4 w-4" strokeWidth={1.75} />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm shadow-sm ${
                  isUser
                    ? 'border border-[#2E2E2E] bg-[#141414] text-[#FAFAFA] rounded-tr-sm'
                    : 'border border-[#1F1F1F] bg-[#0A0A0A] text-[#A0A0A0] rounded-tl-sm'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center space-x-2 mb-2 pb-1.5 border-b border-[#141414]">
                    <span className="font-semibold text-xs text-[#FAFAFA] flex items-center space-x-1">
                      <span>AslCheck AI</span>
                      <ShieldCheck className="h-3 w-3 text-[#10B981]" strokeWidth={2} />
                    </span>
                    <span className="text-[10px] text-[#525252] font-mono">{msg.timestamp}</span>
                  </div>
                )}

                {isUser ? (
                  <div className="leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.text}
                  </div>
                ) : (
                  renderFormattedText(msg.text)
                )}

                {isUser && (
                  <div className="mt-1 text-right text-[10px] text-[#525252] font-mono">
                    {msg.timestamp}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start space-x-2.5 sm:space-x-3 animate-in fade-in">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] text-[#10B981]">
              <Sparkles className="h-4 w-4 animate-spin text-[#10B981]" strokeWidth={1.75} />
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-[#1F1F1F] bg-[#0A0A0A] p-3.5 text-xs text-[#888888] shadow-sm flex items-center space-x-2">
              <span className="text-[#888888]">Gemini 3.5 tahlil qilmoqda</span>
              <span className="flex space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-bounce [animation-delay:0.4s]" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="pt-3 border-t border-[#1F1F1F]">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Mahsulot tarkibi, sifati yoki qadoq bo‘yicha savol bering..."
            disabled={isLoading}
            className="w-full rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] py-3 pl-4 pr-24 text-xs sm:text-sm text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
          />
          <div className="absolute right-1.5 flex items-center space-x-1">
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="flex items-center space-x-1.5 rounded-lg bg-[#FAFAFA] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#E5E5E5] disabled:opacity-30 transition-colors shadow-sm"
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
          </div>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#525252] px-1">
          <span className="flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3 text-[#10B981]" strokeWidth={1.75} />
            <span>AslCheck AI xolis va ilmiy standartlar asosida javob beradi</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px]">
            Google Gemini 3.5 Flash
          </span>
        </div>
      </div>
    </div>
  );
};
