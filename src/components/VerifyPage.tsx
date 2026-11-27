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
import { AslBrandMark, AiCoreIcon, VisionLensIcon } from './Icons';
import { UzbekGirihPattern } from './UzbekGirihPattern';
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
    <div className="relative overflow-hidden bg-[#000000]">
      {/* Authentic Uzbek Girih Architectural Pattern & Ethereal Aura */}
      <UzbekGirihPattern />

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

      {/* Hero / Header: Pure Two-tone Minimalist Typography */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center space-x-2 rounded-full border border-[#1F1F23] bg-[#0A0A0C] px-3.5 py-1 text-xs text-[#71717A] mb-4 sm:mb-5 shadow-sm">
          <AslBrandMark className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
          <span>Litsenziyalangan Mahsulot Reyestri</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">
          <span>Mahsulot haqiqiyligini</span> <span className="text-[#71717A]">tekshiring.</span>
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-[#71717A] max-w-lg mx-auto leading-relaxed">
          Qadoqdagi unikal seriya kodini kiriting, QR-kodni skanerlang yoki qadoq fotosuratini AslCheck Yordamchiga taqdim eting.
        </p>
      </div>

      {/* Main Verification Input Box: Pure #0A0A0C with 1px #1F1F23 */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#1F1F23] bg-[#0A0A0C] p-5 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.9)]">
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <Search className="h-4 w-4 text-[#71717A]" strokeWidth={1.75} />
              </div>
              <input
                ref={codeInputRef}
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Masalan: ASL-2026-001"
                disabled={isLoading || isVisionLoading}
                className="w-full rounded-xl border border-[#1F1F23] bg-black py-3.5 pl-11 pr-3 font-mono text-base font-medium tracking-wide text-white placeholder-[#52525B] focus:border-white/40 focus:outline-none transition-colors min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || isVisionLoading}
              className="flex items-center justify-center space-x-1.5 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-[#F4F4F5] disabled:opacity-60 transition-all shadow-[0_0_30px_rgba(255,255,255,0.18)] hover:shadow-[0_0_35px_rgba(255,255,255,0.28)] min-h-[44px] shrink-0"
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

          {/* Dual Hardware Action Row: Secondary Buttons in Transparent Black with #27272A border */}
          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isVisionLoading}
              onClick={() => setIsScannerOpen(true)}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#27272A] bg-black/50 py-3 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-black/80 disabled:opacity-40 transition-colors min-h-[44px]"
            >
              <QrCode className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
              <span>QR-kodni skanerlash</span>
            </button>

            <button
              type="button"
              disabled={isVisionLoading}
              onClick={() => visionFileInputRef.current?.click()}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#27272A] bg-black/50 py-3 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-black/80 disabled:opacity-40 transition-colors min-h-[44px]"
            >
              {isVisionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" strokeWidth={1.75} />
              ) : (
                <VisionLensIcon className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
              )}
              <span>AI Vizual Ekspertiza</span>
            </button>
          </div>
        </form>

        {/* Sleek Integrated Demo Pills (Pure Minimalist Monochrome with Semantic Dots) */}
        <div className="mt-4 pt-3.5 border-t border-[#1F1F23] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-[#71717A] font-mono tracking-wide">
            Sinov uchun kodlar:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDemoClick('ASL-2026-001')}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-[#1F1F23] bg-black/60 px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:border-[#27272A] hover:text-white transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              <span>ASL-2026-001</span>
              <span className="text-[10px] text-[#71717A] font-sans">(Asl)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('ASL-2026-999')}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-[#1F1F23] bg-black/60 px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:border-[#27272A] hover:text-white transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              <span>ASL-2026-999</span>
              <span className="text-[10px] text-[#71717A] font-sans">(Shubhali)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoClick('FAKE-000')}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-[#1F1F23] bg-black/60 px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:border-[#27272A] hover:text-white transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
              <span>FAKE-000</span>
              <span className="text-[10px] text-[#71717A] font-sans">(Topilmadi)</span>
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
        {/* AslCheck Master Bento Architecture: Awwwards / Jimo Pure Black (#0A0A0C, #1F1F23) */}
        {!isLoading && !verificationResult && !visionResult && !isVisionLoading && !visionError && (
          <div className="mt-10 mx-auto max-w-4xl space-y-4">
            {/* Section Header: Two-tone Minimalist Typography */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                <h2 className="text-xs font-mono font-medium tracking-wider uppercase">
                  <span className="text-white">Tizim reglamenti</span>{' '}
                  <span className="text-[#71717A]">& texnik imkoniyatlar</span>
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#71717A] hidden sm:inline-block">
                Standart v2.4 • Raqamli Reyestr
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
              {/* CARD 1: HERO VIDEO GUIDE (md:col-span-7) */}
              <div className="md:col-span-7 rounded-2xl border border-[#1F1F23] bg-[#0A0A0C] p-6 sm:p-7 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:border-zinc-500 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center space-x-1.5 rounded-md border border-[#1F1F23] bg-black/60 px-2.5 py-0.5 text-[10px] font-mono text-zinc-400">
                      <Film className="h-3 w-3 text-zinc-400" />
                      <span>Video Reglament • 1:11 min</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#71717A]">
                      1080p HD
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-semibold tracking-tight">
                    <span className="text-white">Tizimning ishlash reglamenti</span>{' '}
                    <span className="text-[#71717A]">• rasmiy yo‘riqnoma</span>
                  </h3>
                  <p className="mt-1.5 text-xs text-[#71717A] leading-relaxed">
                    QR-kod verifikatsiyasi, raqamli pasport, AI tahlil va anti-kontrafakt protokoli bo‘yicha rasmiy video qo‘llanma.
                  </p>
                </div>

                {/* Minimalist Monochrome Video Preview Box */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={onOpenVideoGuide}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenVideoGuide?.()}
                  className="mt-5 relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-[#1F1F23] bg-black cursor-pointer group shadow-inner"
                >
                  <img
                    src="/video-poster.jpg"
                    alt="Video reglament preview"
                    className="h-full w-full object-cover opacity-75 group-hover:opacity-95 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white backdrop-blur-md shadow-[0_0_24px_rgba(255,255,255,0.16)] group-hover:scale-105 group-hover:bg-white/20 transition-all">
                      <Play className="h-4 w-4 fill-white translate-x-0.5" />
                    </div>
                  </div>

                  {/* Micro Footer Indicator */}
                  <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-[10px] font-mono text-zinc-300 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1F1F23]">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      <span>Ovozli tushuntirish</span>
                    </span>
                    <span className="text-zinc-400 group-hover:text-white transition-colors">Ko‘rish uchun bosing →</span>
                  </div>
                </div>

                {/* Bottom Quick Chapters */}
                <div className="mt-4 pt-3.5 border-t border-[#1F1F23] flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[#71717A]">
                  <span className="text-zinc-600">Mavzular:</span>
                  <span className="rounded border border-[#1F1F23] bg-black/50 px-2 py-0.5 text-zinc-400">00:12 Pasport</span>
                  <span className="rounded border border-[#1F1F23] bg-black/50 px-2 py-0.5 text-zinc-400">00:26 AslCheck Yordamchi</span>
                  <span className="rounded border border-[#1F1F23] bg-black/50 px-2 py-0.5 text-zinc-400">00:38 Klon Radari</span>
                  <span className="rounded border border-[#1F1F23] bg-black/50 px-2 py-0.5 text-zinc-400">00:50 B2B QR</span>
                </div>
              </div>

              {/* CARD 2: ASLCHECK YORDAMCHI (md:col-span-5) */}
              <div className="md:col-span-5 rounded-2xl border border-[#1F1F23] bg-[#0A0A0C] p-6 sm:p-7 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:border-zinc-500 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center space-x-1.5 rounded-md border border-[#1F1F23] bg-black/60 px-2.5 py-0.5 text-[10px] font-mono text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      <span>AslCheck Yordamchi • Faol</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#71717A]">Gemini 2.5</span>
                  </div>

                  <h3 className="text-base font-semibold tracking-tight">
                    <span className="text-white">AslCheck Yordamchi</span>{' '}
                    <span className="text-[#71717A]">— tarkib tahlili</span>
                  </h3>
                  <p className="mt-1.5 text-xs text-[#71717A] leading-relaxed">
                    Mahsulot standarti, E-qo‘shimchalar va laboratoriya parametrlari bo‘yicha avtomatlashtirilgan aqlli tahlilchi.
                  </p>
                </div>

                {/* Gemini AI Ovoz To'lqini: Nozik ko'k-binafsha nur */}
                <div className="my-4 rounded-xl border border-[#1F1F23] bg-black/60 p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {[40, 75, 55, 90, 65, 80, 45, 95, 60, 85, 50, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-gradient-to-t from-blue-500/80 via-indigo-400 to-violet-300 shadow-[0_0_10px_rgba(99,102,241,0.4)] animate-pulse"
                        style={{ height: `${h * 0.28}px`, animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-[#71717A]">AI Ovoz to‘lqini</span>
                </div>

                {/* Question Chips */}
                <div className="space-y-1.5 mb-4">
                  <button
                    type="button"
                    onClick={() => onNavigateToAi?.("Tog' asali tarkibida qanday vitaminlar va tabiiy fermentlar bor?")}
                    className="w-full text-left truncate rounded-lg border border-[#1F1F23] bg-black/50 hover:bg-[#141416] hover:border-[#27272A] px-2.5 py-1.5 text-[11px] text-zinc-300 transition-colors"
                  >
                    💬 "Asal tabiiyligini qanday tekshiradi?"
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToAi?.("Oziq-ovqat mahsulotlaridagi E-raqamlar xavfli ekanligini qanday bilish mumkin?")}
                    className="w-full text-left truncate rounded-lg border border-[#1F1F23] bg-black/50 hover:bg-[#141416] hover:border-[#27272A] px-2.5 py-1.5 text-[11px] text-zinc-300 transition-colors"
                  >
                    💬 "E-moddalar va allergenlar tahlili"
                  </button>
                </div>

                {/* Primary CTA button: Pure White with Ethereal Aura */}
                <button
                  type="button"
                  onClick={() => onNavigateToAi?.()}
                  className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-white text-black font-semibold py-3 text-xs shadow-[0_0_30px_rgba(255,255,255,0.18)] hover:bg-[#F4F4F5] hover:shadow-[0_0_35px_rgba(255,255,255,0.28)] transition-all min-h-[42px]"
                >
                  <AiCoreIcon className="h-3.5 w-3.5 text-black" />
                  <span>AI bilan muloqot</span>
                  <ArrowRight className="h-3 w-3 text-black" />
                </button>
              </div>

              {/* CARD 3: ANTI-KLON HIMOYASI (md:col-span-6) */}
              <div className="md:col-span-6 rounded-2xl border border-[#1F1F23] bg-[#0A0A0C] p-6 sm:p-7 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:border-zinc-500 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center space-x-1.5 rounded-md border border-[#1F1F23] bg-black/60 px-2.5 py-0.5 text-[10px] font-mono text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                      <span>Kriptografik Filtr</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#71717A]">Real-vaqt</span>
                  </div>

                  <h3 className="text-base font-semibold tracking-tight">
                    <span className="text-white">Anti-kontrafakt</span>{' '}
                    <span className="text-[#71717A]">va klon radari</span>
                  </h3>
                  <p className="mt-1.5 text-xs text-[#71717A] leading-relaxed">
                    Nusxalangan yoki shubhali hududda takroriy skanerlangan kodlarni real-vaqt rejimida aniqlash va bloklash protokoli.
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#1F1F23] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    <span className="text-[11px] font-mono text-[#71717A]">Monitoring faol</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDemoClick('ASL-2026-999')}
                    className="text-[11px] text-zinc-300 hover:text-white font-medium underline underline-offset-2 transition-colors"
                  >
                    Shubhali kodni tekshirish →
                  </button>
                </div>
              </div>

              {/* CARD 4: ISHLAB CHIQARUVCHI B2B KABINETI (md:col-span-6) */}
              <div className="md:col-span-6 rounded-2xl border border-[#1F1F23] bg-[#0A0A0C] p-6 sm:p-7 flex flex-col justify-between shadow-[0_16px_40px_rgba(0,0,0,0.7)] hover:border-zinc-500 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center space-x-1.5 rounded-md border border-[#1F1F23] bg-black/60 px-2.5 py-0.5 text-[10px] font-mono text-zinc-300">
                      <Factory className="h-3 w-3 text-zinc-400" />
                      <span>B2B Tizim Integratsiyasi</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#71717A]">Tezkor B2B</span>
                  </div>

                  <h3 className="text-base font-semibold tracking-tight">
                    <span className="text-white">Korxona partiyalari</span>{' '}
                    <span className="text-[#71717A]">& QR generator</span>
                  </h3>
                  <p className="mt-1.5 text-xs text-[#71717A] leading-relaxed">
                    Ishlab chiqaruvchilar uchun xavfsiz unikal QR-kodlar generatsiyasi, partiya sertifikatsiyasi va reyestr boshqaruvi.
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#1F1F23] flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-[#71717A]">A4 Chop etish • Excel import</span>
                  {onNavigateToProducer && (
                    <button
                      type="button"
                      onClick={onNavigateToProducer}
                      className="text-[11px] text-zinc-300 hover:text-white font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Korxona kabinetiga o‘tish</span>
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
