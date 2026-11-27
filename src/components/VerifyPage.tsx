import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Search,
  QrCode,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Play,
  Film,
  Factory,
} from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import { VerificationCard } from './VerificationCard';
import { AudioPlayerButton } from './AudioPlayerButton';
import { AslBrandMark, AiCoreIcon, VisionLensIcon, CloneAlertIcon } from './Icons';
import { verifyProduct, lookupProductByCode } from '../lib/api';
import { verifyImageWithVision } from '../lib/ai';
import { extractSerialCode, compressImageForVision } from '../lib/qr';
import type {
  VerificationResult,
  VisionVerifyResult,
  ProductWithManufacturer,
} from '../types';

interface VerifyPageProps {
  onNavigateToAi?: (question?: string) => void;
  onNavigateToProducer?: () => void;
  onOpenVideoGuide?: () => void;
}

function getInitialCodeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get('code');
  const isAuthTab = params.get('tab') === 'producer';
  const isUuidAuthCode = Boolean(
    codeParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeParam.trim())
  );
  if (codeParam && !isAuthTab && !isUuidAuthCode) {
    return codeParam.trim().toUpperCase();
  }
  return '';
}

export const VerifyPage: React.FC<VerifyPageProps> = ({
  onNavigateToAi,
  onNavigateToProducer,
  onOpenVideoGuide,
}) => {
  const [inputCode, setInputCode] = useState<string>(getInitialCodeFromUrl);
  const [searchedCode, setSearchedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Refs for input focus, smooth scroll-to-result, and race-safe latest-request guard
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const visionFileInputRef = useRef<HTMLInputElement | null>(null);
  const resultSectionRef = useRef<HTMLDivElement | null>(null);
  const verifyReqCounterRef = useRef(0);
  const hasAutoVerifiedRef = useRef(false);

  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [visionStageText, setVisionStageText] = useState('Surat tahlil qilinmoqda...');
  const [visionPreviewUrl, setVisionPreviewUrl] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<VisionVerifyResult | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);

  const scrollToResultSmooth = useCallback(() => {
    window.setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  // Core verification executor (race-safe)
  const handleVerify = useCallback(
    async (codeToVerify: string, shouldScroll: boolean = true) => {
      const trimmed = codeToVerify.trim().toUpperCase();
      if (!trimmed) return;

      const reqId = ++verifyReqCounterRef.current;
      setIsLoading(true);
      setSearchedCode(trimmed);
      setVerificationResult(null);

      try {
        const result = await verifyProduct(trimmed);
        if (reqId !== verifyReqCounterRef.current) return;

        setVerificationResult(result);
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('code', trimmed);
        window.history.replaceState({}, '', newUrl.toString());

        if (shouldScroll) {
          scrollToResultSmooth();
        }
      } catch (err) {
        console.error('Verification error:', err);
      } finally {
        if (reqId === verifyReqCounterRef.current) {
          setIsLoading(false);
        }
      }
    },
    [scrollToResultSmooth]
  );

  // URL Auto-Verify on mount when ?code=... is present
  useEffect(() => {
    if (hasAutoVerifiedRef.current) return;
    const initialCode = getInitialCodeFromUrl();
    if (!initialCode) return;

    hasAutoVerifiedRef.current = true;
    const timer = window.setTimeout(() => {
      void handleVerify(initialCode, false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handleVerify]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      codeInputRef.current?.focus();
      return;
    }
    setVisionResult(null);
    setVisionPreviewUrl(null);
    setVisionError(null);
    handleVerify(inputCode);
  };

  const handleScanSuccess = (scannedCode: string) => {
    setIsScannerOpen(false);
    setVisionResult(null);
    setVisionPreviewUrl(null);
    setVisionError(null);
    setInputCode(scannedCode);
    handleVerify(scannedCode);
  };

  const handleDemoClick = (demoCode: string) => {
    setVisionResult(null);
    setVisionPreviewUrl(null);
    setVisionError(null);
    setInputCode(demoCode);
    handleVerify(demoCode);
  };

  // Hybrid Client QR + Gemini Vision Cross-Verification
  const handleVisionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVisionLoading(true);
    setVisionError(null);
    setVisionResult(null);
    setVerificationResult(null);

    try {
      // Step A: Attempt instant client-side QR decode (dynamically loaded)
      setVisionStageText('1/3 — QR matritsa dekod qilinmoqda...');
      let decodedCode: string | null = null;
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const html5QrCode = new Html5Qrcode('vision-qr-decoder-temp');
        const rawDecoded = await html5QrCode.scanFile(file, false);
        if (rawDecoded) {
          decodedCode = extractSerialCode(rawDecoded);
        }
        try {
          html5QrCode.clear();
        } catch {
          // Ignore clear errors
        }
      } catch {
        // Silent fallback if no crisp QR decoded locally; Gemini Vision OCR will attempt extraction
      }

      // Step B: Database lookup if code was decoded locally
      let expectedProduct: ProductWithManufacturer | null = null;
      if (decodedCode) {
        setVisionStageText(`2/3 — ${decodedCode} pasporti bazadan olinmoqda...`);
        expectedProduct = await lookupProductByCode(decodedCode);
      } else {
        setVisionStageText('2/3 — Rasm siqilmoqda (max 1024px JPEG)...');
      }

      // Step C: Compress image on offscreen canvas & send to /api/ai (vision_verify)
      const { dataUrl, base64, mimeType } = await compressImageForVision(file, 1024, 0.8);
      setVisionPreviewUrl(dataUrl);
      setVisionStageText('3/3 — AI Vizual Kriminalistika tahlili o‘tkazilmoqda...');

      const forensic = await verifyImageWithVision({
        imageBase64: base64,
        mimeType,
        decodedCode,
        expectedProduct,
      });

      setVisionResult(forensic);

      // Automatically trigger full Digital Passport verification if code found
      const finalCode =
        decodedCode ||
        (forensic.detected_code &&
        forensic.detected_code.toLowerCase() !== 'null' &&
        forensic.detected_code.trim().length > 3
          ? extractSerialCode(forensic.detected_code)
          : null);

      if (finalCode) {
        setInputCode(finalCode);
        await handleVerify(finalCode, true);
      } else {
        scrollToResultSmooth();
      }
    } catch (err: any) {
      console.error('Vision verification error:', err);
      setVisionError(err?.message || 'Rasmni tahlil qilishda xatolik yuz berdi.');
    } finally {
      setIsVisionLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Subtle Architectural Dot-Grid & Ambient Spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 85% 75% at 50% 0%, black 35%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 85% 75% at 50% 0%, black 35%, transparent 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 h-56 w-[90%] max-w-xl rounded-full bg-gradient-to-r from-white via-emerald-400 to-white opacity-[0.07] blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-3 py-6 sm:px-6 sm:py-12">
      {/* Hidden input & temp decoder mount for Hybrid Vision Forensics */}
      <input
        ref={visionFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleVisionFileChange}
        className="hidden"
      />
      <div id="vision-qr-decoder-temp" className="hidden" />

      {/* Hero / Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center space-x-1.5 rounded-full border border-white/10 bg-[#0C0C0C]/90 px-3 py-1 text-xs text-[#A0A0A0] mb-3 sm:mb-4 shadow-sm backdrop-blur-sm">
          <AslBrandMark className="h-3.5 w-3.5 text-[#FAFAFA]" strokeWidth={1.5} />
          <span>Litsenziyalangan Mahsulot Reyestri</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent">
          Mahsulot Haqiqiyligini Tekshirish
        </h1>
        <p className="mt-2.5 text-xs sm:text-sm text-[#888888] max-w-md mx-auto leading-relaxed">
          Qadoqdagi unikal AslCheck seriya kodini kiriting, QR-kodni skanerlang yoki qadoq suratini AI Vizual Ekspertizaga yuboring.
        </p>
      </div>

      {/* Main Verification Input Box */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.06] border-t-white/15 bg-gradient-to-b from-[#121212] to-[#080808] p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="h-4 w-4 text-[#525252]" strokeWidth={1.75} />
              </div>
              <input
                ref={codeInputRef}
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Masalan: ASL-2026-001"
                disabled={isLoading || isVisionLoading}
                className="w-full rounded-xl border border-white/10 bg-[#050505] py-3 pl-10 pr-3 font-mono text-base font-medium tracking-wide text-[#FAFAFA] placeholder-[#525252] focus:border-white/50 focus:outline-none transition-colors min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || isVisionLoading}
              className="flex items-center justify-center space-x-1.5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60 transition-colors shadow-[0_1px_16px_rgba(255,255,255,0.16)] min-h-[44px] shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <>
                  <span>Tekshirish</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </>
              )}
            </button>
          </div>

          {/* Dual Hardware Action Row: Live QR Scanner + AI Vision Forensics */}
          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isVisionLoading}
              onClick={() => setIsScannerOpen(true)}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#1F1F1F] bg-[#111111] py-3 text-xs sm:text-sm font-medium text-[#FAFAFA] hover:bg-[#161616] hover:border-[#333333] disabled:opacity-40 transition-colors min-h-[44px]"
            >
              <QrCode className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
              <span>QR-kodni skanerlash</span>
            </button>

            <button
              type="button"
              disabled={isVisionLoading}
              onClick={() => visionFileInputRef.current?.click()}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#262626] bg-[#111111] py-3 text-xs sm:text-sm font-medium text-[#FAFAFA] hover:bg-[#181818] hover:border-[#444444] disabled:opacity-40 transition-colors min-h-[44px]"
            >
              {isVisionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-zinc-300" strokeWidth={1.75} />
              ) : (
                <VisionLensIcon className="h-4 w-4 text-zinc-300" strokeWidth={1.75} />
              )}
              <span>AI Vizual Ekspertiza</span>
            </button>
          </div>
        </form>

        {/* Sleek Integrated Demo Pills */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-[#737373] font-mono tracking-wide">
            Sinov uchun kodlar:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDemoClick('ASL-2026-001')}
              className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ASL-2026-001</span>
              <span className="text-[10px] text-zinc-400 font-sans">(Asl)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('ASL-2026-999')}
              className="inline-flex items-center space-x-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>ASL-2026-999</span>
              <span className="text-[10px] text-zinc-400 font-sans">(Klon)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('FAKE-000')}
              className="inline-flex items-center space-x-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-mono text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span>FAKE-000</span>
              <span className="text-[10px] text-zinc-400 font-sans">(Topilmadi)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vision Forensics Loading State */}
      {isVisionLoading && (
        <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-white/[0.08] border-t-white/15 bg-gradient-to-b from-[#121212] to-[#080808] p-6 text-center space-y-2.5 animate-in fade-in">
          <VisionLensIcon className="h-6 w-6 mx-auto text-zinc-300 animate-pulse" strokeWidth={1.75} />
          <div className="text-xs font-semibold text-[#FAFAFA]">{visionStageText}</div>
          <div className="text-[11px] text-[#525252] font-mono">
            Hybrid QR Decode + Gemini Vision Cross-Verification
          </div>
        </div>
      )}

      {/* Vision Error */}
      {visionError && !isVisionLoading && (
        <div className="mt-6 mx-auto max-w-2xl rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 flex items-center space-x-3 text-xs text-[#EF4444]">
          <XCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{visionError}</span>
        </div>
      )}

      {/* Vision Forensics Result Panel */}
      {!isVisionLoading && visionResult && (
        <div className="mt-8 mx-auto max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] border-t-white/15 bg-gradient-to-b from-[#121212] to-[#080808] shadow-[0_24px_60px_rgba(0,0,0,0.85)] animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1F1F1F] bg-[#0D0D0D] px-4 sm:px-5 py-3.5">
            <div className="flex items-center space-x-2">
              <VisionLensIcon className="h-4 w-4 text-zinc-300" strokeWidth={1.75} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#FAFAFA]">
                AI Vizual Kriminalistika Ekspertizasi
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setVisionResult(null);
                setVisionPreviewUrl(null);
              }}
              className="rounded p-1.5 text-[#888888] hover:bg-[#141414] hover:text-[#FAFAFA]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {/* Top Split: Thumbnail + Forensic Metrics */}
            <div className="flex flex-col sm:flex-row gap-4">
              {visionPreviewUrl && (
                <div className="shrink-0 flex justify-center sm:justify-start">
                  <img
                    src={visionPreviewUrl}
                    alt="Tekshirilgan qadoq surati"
                    className="h-32 w-32 sm:h-36 sm:w-36 rounded-lg border border-[#222222] object-cover bg-black"
                  />
                </div>
              )}

              <div className="flex-1 space-y-3">
                {/* Confidence Score Meter */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-[11px] text-[#888888]">
                      Vizual Ishonchlilik Darajasi
                    </span>
                    <span className="font-mono font-bold text-[#FAFAFA]">
                      {visionResult.confidence_score}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#141414]">
                    <div
                      className={`h-full transition-all duration-500 ${
                        visionResult.confidence_score >= 75
                          ? 'bg-[#10B981]'
                          : visionResult.confidence_score >= 45
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#EF4444]'
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, visionResult.confidence_score))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Badges Grid */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${
                      visionResult.package_match === 'Mos keladi'
                        ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                        : visionResult.package_match === 'Mos kelmaydi'
                        ? 'border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]'
                        : 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`}
                  >
                    Qadoq mosligi: {visionResult.package_match}
                  </span>

                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${
                      visionResult.print_quality === 'Asl zavod bosmasi'
                        ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]'
                        : visionResult.print_quality.includes('Shubhali')
                        ? 'border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]'
                        : 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`}
                  >
                    Bosma: {visionResult.print_quality}
                  </span>

                  {visionResult.detected_code &&
                    visionResult.detected_code.toLowerCase() !== 'null' && (
                      <span className="inline-flex items-center rounded border border-[#262626] bg-[#141414] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#FAFAFA]">
                        Kod: {visionResult.detected_code}
                      </span>
                    )}
                </div>

                {/* Verdict text + Audio Playback */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-[#A0A0A0] leading-relaxed break-words">
                    {visionResult.forensic_verdict}
                  </p>
                  <div className="flex items-center justify-start pt-1">
                    <AudioPlayerButton
                      text={visionResult.forensic_verdict}
                      id={`vision-verdict-${visionResult.detected_code || 'res'}`}
                      label="Ekspert xulosasini tinglash"
                      variant="pill"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Forensic Check Rows */}
            {visionResult.forensic_checks && visionResult.forensic_checks.length > 0 && (
              <div className="space-y-2 border-t border-[#141414] pt-4">
                {visionResult.forensic_checks.map((chk, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-[#141414] bg-[#050505] p-3 text-xs"
                  >
                    <div className="flex items-start space-x-2.5">
                      {chk.status === 'pass' ? (
                        <CheckCircle2
                          className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5"
                          strokeWidth={1.75}
                        />
                      ) : chk.status === 'fail' ? (
                        <XCircle
                          className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <AlertTriangle
                          className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5"
                          strokeWidth={1.75}
                        />
                      )}
                      <div>
                        <div className="font-semibold text-[#FAFAFA]">{chk.label}</div>
                        <div className="text-[11px] text-[#888888] mt-0.5 leading-relaxed">
                          {chk.detail}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`self-start sm:self-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                        chk.status === 'pass'
                          ? 'text-[#10B981] bg-[#10B981]/10'
                          : chk.status === 'fail'
                          ? 'text-[#EF4444] bg-[#EF4444]/10'
                          : 'text-[#F59E0B] bg-[#F59E0B]/10'
                      }`}
                    >
                      {chk.status === 'pass'
                        ? 'TASDIQLANDI'
                        : chk.status === 'fail'
                        ? 'XAVF'
                        : 'DIQQAT'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Verification Result Anchor (auto-scrolled into view on mobile/desktop) */}
      <div ref={resultSectionRef} className="scroll-mt-20">
        {/* AslCheck Master Bento Architecture (Unified 4-Quadrant Showcase) */}
        {!isLoading && !verificationResult && !visionResult && !isVisionLoading && !visionError && (
          <div className="mt-8 mx-auto max-w-4xl space-y-3.5">
            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-zinc-400">
                  Platforma Imkoniyatlari & Video Qo‘llanma
                </h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-600 hidden sm:inline-block">
                v2.4 PRO • Gemini AI Powered
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* CARD 1: HERO VIDEO GUIDE (md:col-span-7) */}
              <div className="md:col-span-7 rounded-2xl border border-white/[0.08] border-t-emerald-500/40 bg-gradient-to-b from-[#0F1714] via-[#090D0B] to-[#060606] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.85)] hover:border-emerald-500/50 transition-all duration-300">
                {/* Ambient glow highlight */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20 transition-all" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-400">
                      <Film className="h-3 w-3" />
                      <span>Video Qo‘llanma • 1:11 min</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      1080p HD
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    AslCheck PRO qanday ishlaydi?
                  </h3>
                  <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                    QR skanerlash, raqamli pasport, o‘zbekcha AI ovozli tahlil va soxta kod radari bo‘yicha 1 daqiqalik rasmiy video qo‘llanma.
                  </p>
                </div>

                {/* Video Preview Box with Play Overlay */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={onOpenVideoGuide}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenVideoGuide?.()}
                  className="mt-4 relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer shadow-inner"
                >
                  <img
                    src="/video-poster.jpg"
                    alt="Video yo'riqnoma preview"
                    className="h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform">
                      <Play className="h-5 w-5 fill-black translate-x-0.5" />
                    </div>
                  </div>

                  {/* Chapter Chips overlay on bottom */}
                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] font-mono text-zinc-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Ovozli tushuntirish</span>
                    </span>
                    <span className="text-emerald-400">Ko‘rish uchun bosing →</span>
                  </div>
                </div>

                {/* Bottom Quick Chapters */}
                <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                  <span className="text-zinc-600">Mavzular:</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-300">00:12 Pasport</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-300">00:26 AI Ovoz</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-300">00:38 Klon Radari</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-300">00:50 B2B QR</span>
                </div>
              </div>

              {/* CARD 2: AI OVOZLI EKSPERT (md:col-span-5) */}
              <div className="md:col-span-5 rounded-2xl border border-white/[0.08] border-t-indigo-500/40 bg-gradient-to-b from-[#111018] via-[#0B0A0F] to-[#060606] p-4 sm:p-5 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.85)] hover:border-indigo-500/40 transition-all duration-300 relative overflow-hidden group">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-mono font-medium text-indigo-300">
                      <AiCoreIcon className="h-3 w-3" />
                      <span>AI Ovozli Ekspert • FAOL</span>
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  </div>

                  <h3 className="text-base font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                    Gemini AI bilan muloqot
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Mahsulot tarkibi, E-moddalar, laboratoriya tahlili va tabiiylik darajasini ovozli tarzda so‘rang.
                  </p>
                </div>

                {/* Animated Waveform Visualizer Mockup */}
                <div className="my-3.5 rounded-xl border border-white/5 bg-black/60 p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {[40, 75, 55, 90, 65, 80, 45, 95, 60, 85, 50, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-indigo-500 to-emerald-400 rounded-full animate-pulse"
                        style={{ height: `${h * 0.28}px`, animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">O‘zbekcha ovoz</span>
                </div>

                {/* Quick Question Chips */}
                <div className="space-y-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => onNavigateToAi?.("Tog' asali tarkibida qanday vitaminlar va tabiiy fermentlar bor?")}
                    className="w-full text-left truncate rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 transition-colors"
                  >
                    💬 "Asal tabiiyligini qanday tekshiradi?"
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToAi?.("Oziq-ovqat mahsulotlaridagi E-raqamlar xavfli ekanligini qanday bilish mumkin?")}
                    className="w-full text-left truncate rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 transition-colors"
                  >
                    💬 "E-moddalar va allergenlar tahlili"
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToAi?.()}
                  className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-all shadow-sm"
                >
                  <AiCoreIcon className="h-3.5 w-3.5" />
                  <span>AI bilan gaplashish</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* CARD 3: ANTI-KLON HIMOYASI (md:col-span-6) */}
              <div className="md:col-span-6 rounded-2xl border border-white/[0.08] border-t-amber-500/40 bg-gradient-to-b from-[#14100C] via-[#0E0C09] to-[#060606] p-4 sm:p-5 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.85)] hover:border-amber-500/40 transition-all duration-300 relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-mono font-medium text-amber-400">
                      <CloneAlertIcon className="h-3 w-3" />
                      <span>Kriptografik Anti-Klon</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Real-vaqt</span>
                  </div>

                  <h3 className="text-base font-bold tracking-tight text-white group-hover:text-amber-200 transition-colors">
                    Soxta Kod & Klon Radari
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    Agar bitta QR-kod bir vaqtning o‘zida turli nuqtalarda skanerlansa yoki limitdan oshsa, tizim zudlik bilan qizil ogohlantirish beradi va xaritada shubhali nuqtani belgilaydi.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[11px] font-mono text-zinc-300">Klon filtri faol</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDemoClick('ASL-2026-999')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2"
                  >
                    Klon kodni sinash →
                  </button>
                </div>
              </div>

              {/* CARD 4: ISHLAB CHIQARUVCHI B2B KABINETI (md:col-span-6) */}
              <div className="md:col-span-6 rounded-2xl border border-white/[0.08] border-t-zinc-400/40 bg-gradient-to-b from-[#141414] via-[#0E0E0E] to-[#060606] p-4 sm:p-5 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.85)] hover:border-zinc-500/40 transition-all duration-300 relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono font-medium text-zinc-300">
                      <Factory className="h-3 w-3" />
                      <span>Ishlab Chiqaruvchi Kabineti</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Tezkor B2B</span>
                  </div>

                  <h3 className="text-base font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">
                    1 Bosishda 100 ta Unikal QR
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    AI Smart Fill, Excel import yoki 1 bosishda partiyani ko‘paytirish orqali yuzlab kriptografik himoyalangan QR kodlarni generatsiya qiling va A4 formatda chop eting.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-zinc-400">A4 Chop etish • Excel import</span>
                  {onNavigateToProducer && (
                    <button
                      type="button"
                      onClick={onNavigateToProducer}
                      className="text-[11px] text-zinc-200 hover:text-white font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Kabinetga o‘tish</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Card Result */}
        {!isLoading && verificationResult && (
          <div className="mt-8">
            <VerificationCard
              key={`${searchedCode}-${verificationResult.status}-${verificationResult.product?.id ?? 'none'}-${verificationResult.product?.scan_count ?? 0}`}
              result={verificationResult}
              searchedCode={searchedCode}
              onAskAiAboutProduct={(prompt) => onNavigateToAi?.(prompt)}
            />
          </div>
        )}
      </div>

      {/* Live QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
      </div>
    </div>
  );
};
