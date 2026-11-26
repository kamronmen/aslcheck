import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Search,
  QrCode,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';
import { QrScannerModal } from './QrScannerModal';
import { VerificationCard } from './VerificationCard';
import { AslBrandMark, AiCoreIcon, VisionLensIcon } from './Icons';
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
}

export const VerifyPage: React.FC<VerifyPageProps> = ({ onNavigateToAi }) => {
  const [inputCode, setInputCode] = useState('');
  const [searchedCode, setSearchedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Hybrid Vision Forensics state
  const visionFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [visionStageText, setVisionStageText] = useState('Surat tahlil qilinmoqda...');
  const [visionPreviewUrl, setVisionPreviewUrl] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<VisionVerifyResult | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);

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
      // Step A: Attempt instant client-side QR decode
      setVisionStageText('1/3 — QR matritsa dekod qilinmoqda...');
      let decodedCode: string | null = null;
      try {
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
        await handleVerify(finalCode);
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
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
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center space-x-1.5 rounded-full border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-1 text-xs text-[#888888] mb-4">
          <AslBrandMark className="h-3.5 w-3.5 text-[#FAFAFA]" strokeWidth={1.5} />
          <span>Litsenziyalangan Mahsulot Reyestri</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#FAFAFA]">
          Mahsulot Haqiqiyligini Tekshirish
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#888888] max-w-md mx-auto leading-relaxed">
          Qadoqdagi unikal AslCheck seriya kodini kiriting, QR-kodni skanerlang yoki qadoq suratini AI Vizual Ekspertizaga yuboring.
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
              disabled={isLoading || isVisionLoading}
              className="w-full rounded-xl border border-[#1F1F1F] bg-[#000000] py-3 pl-10 pr-24 sm:pr-32 font-mono text-sm sm:text-base font-medium tracking-wide text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
            />
            <div className="absolute inset-y-1.5 right-1.5 flex items-center">
              <button
                type="submit"
                disabled={isLoading || isVisionLoading || !inputCode.trim()}
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

          {/* Dual Hardware Action Row: Live QR Scanner + AI Vision Forensics */}
          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isVisionLoading}
              onClick={() => setIsScannerOpen(true)}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#1F1F1F] bg-[#111111] py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-[#FAFAFA] hover:bg-[#161616] hover:border-[#333333] disabled:opacity-40 transition-colors"
            >
              <QrCode className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
              <span>QR-kodni skanerlash</span>
            </button>

            <button
              type="button"
              disabled={isVisionLoading}
              onClick={() => visionFileInputRef.current?.click()}
              className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#262626] bg-[#111111] py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-[#FAFAFA] hover:bg-[#181818] hover:border-[#444444] disabled:opacity-40 transition-colors"
            >
              {isVisionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-[#10B981]" strokeWidth={1.75} />
              ) : (
                <VisionLensIcon className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
              )}
              <span>AI Vizual Ekspertiza</span>
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
            <AiCoreIcon className="h-4.5 w-4.5" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#FAFAFA] flex items-center space-x-1.5">
              <span>AslCheck AI Ekspert</span>
              <span className="inline-flex items-center rounded bg-[#10B981]/15 px-1.5 py-0.2 text-[9px] font-mono font-bold text-[#10B981]">
                ONLINE
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
          className="shrink-0 flex items-center justify-center space-x-1.5 rounded-lg border border-[#262626] bg-[#141414] px-3.5 py-2 text-xs font-semibold text-[#FAFAFA] hover:bg-[#1E1E1E] hover:border-[#444444] transition-colors"
        >
          <AiCoreIcon className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.5} />
          <span>AI bilan maslahat</span>
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Vision Forensics Loading State */}
      {isVisionLoading && (
        <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-[#262626] bg-[#0A0A0A] p-6 text-center space-y-2.5 animate-in fade-in">
          <VisionLensIcon className="h-6 w-6 mx-auto text-[#10B981] animate-pulse" strokeWidth={1.5} />
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
        <div className="mt-8 mx-auto max-w-2xl overflow-hidden rounded-xl border border-[#262626] bg-[#0A0A0A] shadow-2xl animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1F1F1F] bg-[#0D0D0D] px-5 py-3.5">
            <div className="flex items-center space-x-2">
              <VisionLensIcon className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
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
              className="rounded p-1 text-[#888888] hover:bg-[#141414] hover:text-[#FAFAFA]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Top Split: Thumbnail + Forensic Metrics */}
            <div className="flex flex-col sm:flex-row gap-4">
              {visionPreviewUrl && (
                <div className="shrink-0">
                  <img
                    src={visionPreviewUrl}
                    alt="Tekshirilgan qadoq surati"
                    className="h-28 w-28 sm:h-32 sm:w-32 rounded-lg border border-[#222222] object-cover bg-black"
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
                <div className="flex flex-wrap gap-2">
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

                <p className="text-xs text-[#A0A0A0] leading-relaxed">
                  {visionResult.forensic_verdict}
                </p>
              </div>
            </div>

            {/* Forensic Check Rows */}
            {visionResult.forensic_checks && visionResult.forensic_checks.length > 0 && (
              <div className="space-y-2 border-t border-[#141414] pt-4">
                {visionResult.forensic_checks.map((chk, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[#141414] bg-[#050505] p-3 text-xs"
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
                        <div className="text-[11px] text-[#888888] mt-0.5">{chk.detail}</div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold ${
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
