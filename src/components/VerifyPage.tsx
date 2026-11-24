import React, { useState, useEffect } from 'react';
import { Search, QrCode, RefreshCw, Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import { VerificationCard } from './VerificationCard';
import { verifyProduct } from '../lib/api';
import type { VerificationResult } from '../types';

interface VerifyPageProps {
  onNavigateToAi?: (question?: string) => void;
}

export const VerifyPage: React.FC<VerifyPageProps> = ({ onNavigateToAi }) => {
  const [inputCode, setInputCode] = useState('');
  const [searchedCode, setSearchedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Core verification executor
  const handleVerify = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim().toUpperCase();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setSearchedCode(trimmed);
    setVerificationResult(null);

    try {
      const result = await verifyProduct(trimmed);
      setVerificationResult(result);
      // Update URL query param without full page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('code', trimmed);
      window.history.replaceState({}, '', newUrl.toString());
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // URL Auto-Verify: On page load, check for ?code=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      const cleaned = codeParam.trim().toUpperCase();
      setInputCode(cleaned);
      handleVerify(cleaned);
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(inputCode);
  };

  const handleScanSuccess = (scannedCode: string) => {
    setIsScannerOpen(false);
    setInputCode(scannedCode);
    handleVerify(scannedCode);
  };

  const handleDemoClick = (demoCode: string) => {
    setInputCode(demoCode);
    handleVerify(demoCode);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero / Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center space-x-1.5 rounded-full border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-1 text-xs text-[#888888] mb-4">
          <Sparkles className="h-3.5 w-3.5 text-[#FAFAFA]" strokeWidth={1.75} />
          <span>Litsenziyalangan Mahsulot Reyestri</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#FAFAFA]">
          Mahsulot Haqiqiyligini Tekshirish
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#888888] max-w-md mx-auto leading-relaxed">
          Qadoqdagi unikal AslCheck seriya kodini kiriting yoki QR-kodni skanerlab, nusxalangan kontrafaktdan himoyalaning.
        </p>
      </div>

      {/* Main Verification Input Box */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-4 sm:p-6 shadow-2xl">
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Search className="h-4 w-4 text-[#525252]" strokeWidth={1.75} />
            </div>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Masalan: ASL-2026-001"
              disabled={isLoading}
              className="w-full rounded-xl border border-[#1F1F1F] bg-[#000000] py-3 pl-10 pr-24 sm:pr-32 font-mono text-sm sm:text-base font-medium tracking-wide text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
            />
            <div className="absolute inset-y-1.5 right-1.5 flex items-center">
              <button
                type="submit"
                disabled={isLoading || !inputCode.trim()}
                className="flex items-center space-x-1.5 rounded-lg bg-[#FAFAFA] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-black hover:bg-[#E5E5E5] disabled:opacity-40 transition-colors shadow-sm"
              >
                {isLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <>
                    <span>Tekshirish</span>
                    <ArrowRight className="h-3.5 w-3.5 hidden sm:inline-block" strokeWidth={2} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Scanner Trigger Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#1F1F1F] bg-[#111111] py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-[#FAFAFA] hover:bg-[#161616] hover:border-[#333333] transition-colors"
            >
              <QrCode className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
              <span>QR-kodni kamerada skanerlash</span>
            </button>
          </div>
        </form>

        {/* Quick Demo Strip */}
        <div className="mt-5 pt-4 border-t border-[#141414]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-[11px] text-[#525252] uppercase tracking-wider font-mono">
              Jonli demo sinov kodlari:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoClick('ASL-2026-001')}
                className="flex items-center space-x-1.5 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-1 text-[11px] font-mono text-[#10B981] hover:bg-[#10B981]/20 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                <span>ASL-2026-001</span>
                <span className="text-[10px] text-[#888888]">(Haqiqiy)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('ASL-2026-999')}
                className="flex items-center space-x-1.5 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-1 text-[11px] font-mono text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                <span>ASL-2026-999</span>
                <span className="text-[10px] text-[#888888]">(Shubhali)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('FAKE-000')}
                className="flex items-center space-x-1.5 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-1 text-[11px] font-mono text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                <span>FAKE-000</span>
                <span className="text-[10px] text-[#888888]">(Topilmadi)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent AI Assistant Banner */}
      <div className="mt-5 mx-auto max-w-2xl rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#FAFAFA] flex items-center space-x-1.5">
              <span>AslCheck AI Ekspert</span>
              <span className="inline-flex items-center space-x-1 rounded bg-[#10B981]/15 px-1.5 py-0.2 text-[9px] font-bold text-[#10B981]">
                Gemini 3.5
              </span>
            </div>
            <p className="text-[11px] text-[#888888] mt-0.5 leading-relaxed">
              Mahsulot tabiiyligi, E-qo‘shimchalar yoki qadoqning asl ekanligi bo‘yicha savolingiz bormi?
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateToAi?.()}
          className="shrink-0 flex items-center justify-center space-x-1.5 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3.5 py-2 text-xs font-semibold text-[#FAFAFA] hover:bg-[#1E1E1E] hover:border-[#444444] transition-colors"
        >
          <Lightbulb className="h-3.5 w-3.5 text-[#F59E0B]" strokeWidth={2} />
          <span>AI bilan maslahat</span>
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-6 animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-[#141414]" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 rounded bg-[#141414]" />
              <div className="h-3 w-64 rounded bg-[#141414]" />
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t border-[#141414]">
            <div className="h-20 rounded bg-[#141414]" />
            <div className="h-16 rounded bg-[#141414]" />
          </div>
        </div>
      )}

      {/* Verification Card Result */}
      {!isLoading && verificationResult && (
        <div className="mt-8">
          <VerificationCard
            result={verificationResult}
            searchedCode={searchedCode}
            onAskAiAboutProduct={(prompt) => onNavigateToAi?.(prompt)}
          />
        </div>
      )}

      {/* Live QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
