import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Building2,
  Calendar,
  Layers,
  Clock,
  MapPin,
  Smartphone,
  Flag,
  Send,
  Check,
  Hash,
  AlertOctagon,
  ShieldAlert,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Gift,
  Copy,
} from 'lucide-react';
import { AiCoreIcon, CloneAlertIcon, VerifiedSealIcon } from './Icons';
import { AudioPlayerButton } from './AudioPlayerButton';
import { UzbekistanGeoRadar } from './UzbekistanGeoRadar';
import type { VerificationResult, ScanLog } from '../types';
import { reportFakeProduct, claimProduct, verifyScratchPin } from '../lib/api';
import { analyzeProductWithAi, type ProductAiAnalysis } from '../lib/ai';

interface VerificationCardProps {
  result: VerificationResult;
  searchedCode: string;
  onRefresh?: () => void;
  onAskAiAboutProduct?: (prompt: string) => void;
}

export const VerificationCard: React.FC<VerificationCardProps> = ({
  result,
  searchedCode,
  onAskAiAboutProduct,
}) => {
  const { status, product, logs: initialLogs } = result;
  const [logs, setLogs] = useState<ScanLog[]>(initialLogs);
  const [currentStatus, setCurrentStatus] = useState(status);

  // Ownership Claim & Promo Bonus state
  const [isClaimed, setIsClaimed] = useState<boolean>(Boolean(product?.is_claimed));
  const [claimedAt, setClaimedAt] = useState<string | null>(product?.claimed_at || null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);

  const handleCopyPromo = () => {
    try {
      void navigator.clipboard.writeText('ASL-BONUS-5');
      setCopiedPromo(true);
      window.setTimeout(() => setCopiedPromo(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  // 2FA Scratch-PIN state
  const [scratchPinInput, setScratchPinInput] = useState('');
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState<boolean>(Boolean(product?.is_pin_verified));
  const [pinMessage, setPinMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || isPinVerifying || !scratchPinInput.trim()) return;
    setIsPinVerifying(true);
    setPinMessage(null);
    try {
      const res = await verifyScratchPin(
        product.id,
        scratchPinInput,
        product.serial_code,
        product.scratch_pin
      );
      if (res.success) {
        setIsPinVerified(true);
        setIsClaimed(true);
        setJustClaimed(true);
        setPinMessage({ text: res.message, isError: false });
      } else {
        setPinMessage({ text: res.message, isError: true });
      }
    } catch {
      setPinMessage({ text: 'Tekshirishda xatolik yuz berdi', isError: true });
    } finally {
      setIsPinVerifying(false);
    }
  };

  // Counterfeit Report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportLocation, setReportLocation] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Gemini AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<ProductAiAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Automatic Expiry Date Check (pure across renders)
  const [todayMidnight] = useState(() => new Date().setHours(0, 0, 0, 0));
  const isExpired = product?.expiry_date
    ? new Date(product.expiry_date).getTime() < todayMidnight
    : false;

  // Handle Ownership Claim
  const handleClaim = async () => {
    if (!product || isClaiming || isClaimed) return;
    setIsClaiming(true);
    try {
      const res = await claimProduct(product.id, product.serial_code);
      if (res.success) {
        setIsClaimed(true);
        setClaimedAt(res.claimed_at);
        setJustClaimed(true);
      }
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setIsClaiming(false);
    }
  };

  // Run AI Analysis
  const handleRunAiAnalysis = async () => {
    if (!product || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const analysis = await analyzeProductWithAi(product);
      setAiAnalysis(analysis);
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Submit counterfeit report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || isSubmittingReport) return;

    setIsSubmittingReport(true);
    try {
      const ok = await reportFakeProduct(
        product.id,
        reportLocation,
        reportComment || 'Foydalanuvchi tomonidan soxtalik xabari berildi.'
      );

      if (ok) {
        setReportSuccess(true);
        setCurrentStatus('SUSPICIOUS');
        const newReportLog: ScanLog = {
          id: `report-${Date.now()}`,
          product_id: product.id,
          scanned_at: new Date().toISOString(),
          device_info: 'Joriy foydalanuvchi',
          location_note: reportLocation || 'O‘zbekiston (Shikoyat)',
          is_report: true,
          report_message: reportComment || 'Soxtalik shubhasi bildirildi',
        };
        setLogs([newReportLog, ...logs].slice(0, 5));
      }
    } catch (err) {
      console.error('Report submission failed:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // 1. NOT FOUND / FAKE STATE
  if (currentStatus === 'NOT_FOUND' || !product) {
    return (
      <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-2xl border border-[#EF4444]/35 border-t-[#EF4444]/60 bg-[#0A0A0C] shadow-[0_24px_60px_rgba(0,0,0,0.9)] animate-in fade-in duration-300">
        {/* Top Accent Glow Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#EF4444]/85 to-transparent" />
        {/* Banner */}
        <div className="border-b border-[#18181B] bg-gradient-to-b from-[#EF4444]/12 to-transparent p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]">
              <XCircle className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#EF4444]">
                Xavfsizlik Ogohlantirishi
              </span>
              <h2 className="mt-0.5 text-base sm:text-lg font-semibold tracking-tight text-[#EF4444]">
                MAHSULOT TOPILMADI — SOXTA BO‘LISHI MUMKIN
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                Ushbu seriya kodi rasmiy AslCheck reyestrida mavjud emas. Mahsulot kontrafakt yoki noqonuniy nusxalangan bo‘lishi mumkin.
              </p>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="rounded-xl border border-[#18181B] bg-[#050507] p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1">
              <span className="text-[#71717A]">Tekshirilgan kod:</span>
              <span className="font-mono font-semibold text-white bg-black px-2.5 py-0.5 rounded-md border border-[#1F1F23] break-all self-start sm:self-auto">
                {searchedCode.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#18181B] bg-[#050507] p-4">
            <h4 className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <AlertOctagon className="h-4 w-4 text-[#EF4444]" strokeWidth={1.75} />
              <span>Isteʼmolchi uchun tavsiyalar:</span>
            </h4>
            <ul className="mt-2.5 space-y-1.5 text-xs text-[#71717A] list-disc list-inside leading-relaxed">
              <li>Ushbu mahsulotni sotib olmang va isteʼmol qilmang.</li>
              <li>Sotuvchidan rasmiy muvofiqlik sertifikati va QR pasportini talab qiling.</li>
              <li>Sotuvchi va savdo nuqtasi haqida tegishli nazorat organlariga xabar bering.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 2. FOUND (AUTHENTIC OR SUSPICIOUS)
  const isAuthentic = currentStatus === 'AUTHENTIC';
  const manufacturer = product.manufacturers;

  return (
    <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-2xl border border-[#1F1F23] border-t-white/[0.1] bg-[#0A0A0C] shadow-[0_24px_65px_rgba(0,0,0,0.92)] animate-in fade-in duration-300">
      {/* Top Accent Glow Bar inside Passport Header */}
      <div
        className={`h-[2px] w-full bg-gradient-to-r from-transparent ${
          isExpired
            ? 'via-[#EF4444]/90'
            : isAuthentic
            ? 'via-[#10B981]/85'
            : 'via-[#F59E0B]/85'
        } to-transparent`}
      />
      {/* Top Status Banner */}
      <div
        className={`relative border-b border-[#18181B] p-5 sm:p-6 transition-colors ${
          isExpired
            ? 'bg-gradient-to-b from-[#EF4444]/12 to-transparent'
            : isAuthentic
            ? 'bg-gradient-to-b from-[#10B981]/10 to-transparent'
            : 'bg-gradient-to-b from-[#F59E0B]/10 to-transparent'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isAuthentic
                ? 'border-[#10B981]/30 bg-[#10B981]/15 text-[#10B981]'
                : 'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]'
            }`}
          >
            {isAuthentic ? (
              <CheckCircle className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <CloneAlertIcon className="h-5 w-5" strokeWidth={1.6} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                  isAuthentic ? 'text-[#10B981]' : 'text-[#F59E0B]'
                }`}
              >
                {isAuthentic ? 'Asl Mahsulot Sertifikati' : 'Anti-Clone Ogohlantirish'}
              </span>
              <span className="rounded-md border border-[#1F1F23] bg-black/60 px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA] tabular-nums">
                Skaner: {product.scan_count} / {product.max_safe_scans}
              </span>
            </div>

            <h2
              className={`mt-1.5 text-base sm:text-xl font-semibold tracking-tight ${
                isAuthentic ? 'text-[#10B981]' : 'text-[#F59E0B]'
              }`}
            >
              {isAuthentic
                ? '100% HAQIQIY MAHSULOT'
                : 'DIQQAT! NUSXALANGAN KOD BO‘LISHI MUMKIN'}
            </h2>

            <p className="mt-1.5 text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
              {isAuthentic
                ? 'Ushbu mahsulot rasmiy ishlab chiqaruvchi tomonidan AslCheck davlat standartiga muvofiq ro‘yxatga olingan va xavfsiz chegarada tekshirildi.'
                : `Ushbu unikal kod ${product.scan_count} marta tekshirilgan. Xavfsiz chegara: ${product.max_safe_scans} marta. Bir nechta turli joylarda bir vaqtning o‘zida skaner qilinishi nusxalangan qadoq belgisidir.`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Feature 3: Geo-Radar & Impossible Travel Telemetry Box */}
        {product.velocity_alert && (
          <div className="rounded-xl border border-[#1F1F23] border-l-2 border-l-[#F59E0B] bg-[#050507] p-4 flex flex-col sm:flex-row items-start gap-3 text-xs animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold tracking-tight text-[#F59E0B]">
                  GEO-RADAR & IMPOSSIBLE TRAVEL (ANOMALIYA)
                </span>
                <span className="rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2 py-0.5 text-[10px] font-mono text-[#F59E0B]">
                  Xavf: 98%
                </span>
              </div>

              {/* Timestamped Geographic Anomaly Trace */}
              <div className="rounded-lg border border-[#1F1F23] bg-black/70 px-3 py-2 font-mono text-[11px] text-zinc-200 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>14:10 — Toshkent</span>
                <span className="text-[#52525B]">|</span>
                <span className="text-[#F59E0B] font-semibold">14:25 — Samarqand (Geografik anomaliya)</span>
                <span className="text-[#52525B]">|</span>
                <span>14:42 — Andijon</span>
              </div>

              <p className="text-zinc-300 leading-relaxed">
                {product.velocity_alert}
              </p>

              {/* Live Interactive Uzbekistan Geo-Radar Map */}
              <UzbekistanGeoRadar mode="impossible-travel" />

              <p className="text-[11px] text-[#F59E0B]/90 font-medium">
                Xulosa: Bitta haqiqiy QR-kod rasmga olinib, 20 tagacha qalbaki qadoqlarga ko‘paytirib yopishtirilgan.
              </p>
            </div>
          </div>
        )}

        {/* Feature: Automatic Expiry Date Alert */}
        {isExpired && (
          <div className="rounded-xl border border-[#1F1F23] border-l-2 border-l-[#EF4444] bg-[#050507] p-4 flex flex-col sm:flex-row items-start gap-3 text-xs">
            <AlertOctagon className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <div className="font-semibold tracking-tight text-[#EF4444]">
                OGOHLANTIRISH: Yaroqlilik muddati o‘tgan!
              </div>
              <p className="text-[#71717A] mt-1 leading-relaxed">
                Belgilangan yaroqlilik sanasi ({product.expiry_date}) tugagan. Ushbu mahsulotni isteʼmol qilish sog‘liq uchun xavfli bo‘lishi mumkin.
              </p>
            </div>
          </div>
        )}

        {/* Feature 2: Smart Ownership Claim + 5% Cashback/Bonus Coupon Card */}
        {justClaimed && (
          <div className="rounded-xl border border-[#10B981]/35 bg-[#050507] p-4 space-y-3 animate-in fade-in">
            <div className="flex items-start space-x-2.5 text-xs text-[#10B981]">
              <Gift className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
              <div className="leading-relaxed">
                <div className="font-semibold text-white">
                  Kod sizga band qilindi! Ishlab chiqaruvchidan 5% keyingi xarid bonusi faollashdi
                </div>
                <div className="mt-1 text-[11px] text-[#A1A1AA]">
                  Ushbu unikal kod endi boshqa hech qayerda yangi deb tasdiqlanmaydi.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2.5">
              <div className="flex items-center space-x-2 text-xs whitespace-nowrap">
                <span className="text-[#A1A1AA]">Promo-kod:</span>
                <span className="font-mono font-bold tracking-wider text-[#10B981] whitespace-nowrap">
                  ASL-BONUS-5
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPromo}
                className="inline-flex items-center space-x-1 rounded-md border border-[#10B981]/30 bg-black/70 px-2.5 py-1 text-[11px] font-mono text-white hover:border-[#10B981] transition-colors whitespace-nowrap shrink-0"
              >
                {copiedPromo ? (
                  <>
                    <Check className="h-3 w-3 text-[#10B981]" strokeWidth={2.5} />
                    <span>Nusxalandi</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-[#10B981]" strokeWidth={1.75} />
                    <span>Nusxa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {isClaimed && !justClaimed && (
          <div className="rounded-xl border border-[#1F1F23] border-l-2 border-l-[#F59E0B] bg-[#050507] p-4 flex flex-col sm:flex-row items-start gap-3 text-xs">
            <ShieldAlert className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" strokeWidth={2} />
            <div className="leading-relaxed text-zinc-300">
              <span className="font-semibold text-[#F59E0B]">Bu kod allaqachon xaridor tomonidan band qilingan.</span>{' '}
              Faollashtirilgan vaqti:{' '}
              <span className="font-mono text-white underline underline-offset-2">
                {claimedAt
                  ? new Date(claimedAt).toLocaleString('uz-UZ', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'oldingi xaridor tomonidan'}
              </span>
              . Agar bu rastadagi yopiq yangi qadoq bo‘lsa — qalbaki yoki nusxalangan bo‘lishi mumkin!
            </div>
          </div>
        )}

        {/* Feature 1: Ikki bosqichli 2FA PIN tasdiqlash */}
        {product.scratch_pin && (
          <div className="rounded-xl border border-[#1F1F23] bg-[#050507] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-white flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center space-x-1.5">
                    <KeyRound className="h-4 w-4 text-zinc-300" strokeWidth={1.75} />
                    <span>Ikki bosqichli 2FA PIN tasdiqlash</span>
                  </span>
                  <span className="rounded-md bg-black border border-[#1F1F23] px-2 py-0.5 text-[10px] font-mono text-[#A1A1AA]">
                    2-Bosqichli Himoya
                  </span>
                </div>
                <p className="text-[11px] text-[#71717A] mt-1.5 leading-relaxed">
                  Qallob tashqi QR-kodni 20 ta soxta qutiga ko‘paytirsa ham, qadoq ichidagi maxfiy 4 xonali PIN-kodni bila olmaydi.
                </p>
              </div>

              {isPinVerified && (
                <span className="inline-flex items-center space-x-1 rounded-full border border-[#10B981]/30 bg-[#10B981]/15 px-2.5 py-1 text-[11px] font-mono text-[#10B981] shrink-0 self-start sm:self-auto">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span>Tasdiqlandi</span>
                </span>
              )}
            </div>

            {!isPinVerified ? (
              <form onSubmit={handleVerifyPin} className="space-y-2 pt-0.5">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={scratchPinInput}
                      onChange={(e) => setScratchPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 xonali PIN"
                      disabled={isPinVerifying}
                      className="w-full rounded-xl border border-[#1F1F23] bg-black py-2.5 pl-3.5 pr-28 font-mono text-sm tracking-widest text-white placeholder-[#52525B] focus:border-white/40 focus:outline-none transition-colors min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setScratchPinInput(product.scratch_pin || '')}
                      title="Demo PIN-kodni avtomatik kiritish"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[#1F1F23] bg-[#0A0A0C] px-2 py-1 text-[10px] font-mono text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                    >
                      Demo: {product.scratch_pin}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isPinVerifying || !scratchPinInput.trim()}
                    className="inline-flex items-center justify-center space-x-1.5 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-[#F4F4F5] shadow-[0_0_24px_rgba(255,255,255,0.16)] disabled:opacity-40 transition-all shrink-0 min-h-[42px]"
                  >
                    {isPinVerifying ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
                        <span>Tasdiqlash</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#10B981] flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>Ichki PIN tasdiqlandi — 100% Original</span>
              </div>
            )}

            {pinMessage && !isPinVerified && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center space-x-2 animate-in fade-in ${
                  pinMessage.isError
                    ? 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]'
                    : 'border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981]'
                }`}
              >
                {pinMessage.isError ? (
                  <AlertOctagon className="h-4 w-4 shrink-0" strokeWidth={2} />
                ) : (
                  <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                )}
                <span className="leading-relaxed">{pinMessage.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Feature 2: Ownership Claim Action Button (when not yet claimed) */}
        {!isClaimed && (
          <div className="rounded-xl border border-[#1F1F23] bg-[#050507] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
            <div>
              <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-zinc-300" strokeWidth={1.75} />
                <span>Ushbu mahsulotni xarid qildingizmi?</span>
              </div>
              <p className="text-[11px] text-[#71717A] mt-0.5 leading-relaxed">
                Kodni o‘zingizga band qiling — boshqa hech kim ushbu kodni qayta faollashtirolmaydi.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaiming}
              className="flex items-center justify-center space-x-2 rounded-xl bg-white px-5 py-3 text-xs font-semibold text-black shadow-[0_0_28px_rgba(255,255,255,0.18)] hover:bg-[#F4F4F5] hover:shadow-[0_0_35px_rgba(255,255,255,0.28)] disabled:opacity-50 transition-all shrink-0 min-h-[42px]"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>{isClaiming ? 'Band qilinmoqda...' : 'Sotib oldim — Kodni band qilish'}</span>
            </button>
          </div>
        )}

        {/* Product Details Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
              Raqamli Mahsulot Pasporti
            </h3>
            <span className="font-mono text-xs text-white bg-[#050507] px-2.5 py-0.5 rounded-md border border-[#1F1F23] break-all">
              {product.serial_code}
            </span>
          </div>

          {/* Reference packaging photo (if available) */}
          {product.image_url && (
            <div className="mb-3 overflow-hidden rounded-xl border border-[#1F1F23] bg-black">
              <img
                src={product.image_url}
                alt={product.product_name}
                className="w-full max-h-64 object-cover"
              />
            </div>
          )}

          <div className="rounded-xl border border-[#1F1F23] bg-[#050507] p-4 sm:p-5 divide-y divide-[#18181B]">
            {/* Name & Category */}
            <div className="pb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <span className="text-[11px] text-[#71717A]">Mahsulot nomi</span>
                <div className="text-sm font-semibold text-white break-words">
                  {product.product_name}
                </div>
              </div>
              <div className="sm:text-right">
                <span className="text-[11px] text-[#71717A]">Kategoriya</span>
                <div className="text-xs text-[#A1A1AA]">{product.category}</div>
              </div>
            </div>

            {/* Batch & Dates (Responsive 1 or 3 columns) */}
            <div className="py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <span className="text-[11px] text-[#71717A] flex items-center gap-1">
                  <Hash className="h-3 w-3" strokeWidth={1.75} />
                  Partiya raqami
                </span>
                <div className="font-mono text-xs font-medium text-white mt-0.5 break-words">
                  {product.batch_number}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#71717A] flex items-center gap-1">
                  <Calendar className="h-3 w-3" strokeWidth={1.75} />
                  Ishlab chiqarilgan
                </span>
                <div className="font-mono text-xs text-white mt-0.5">
                  {product.manufacture_date}
                </div>
              </div>

              {/* Expiry Date (Highlighted if expired) */}
              <div>
                <span className="text-[11px] text-[#71717A] flex items-center gap-1">
                  <Clock className="h-3 w-3" strokeWidth={1.75} />
                  Yaroqlilik muddati
                </span>
                <div
                  className={`font-mono text-xs mt-0.5 ${
                    isExpired
                      ? 'text-[#EF4444] font-bold px-1.5 py-0.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 inline-block'
                      : 'text-white'
                  }`}
                >
                  {product.expiry_date} {isExpired ? '(Muddati o‘tgan)' : ''}
                </div>
              </div>
            </div>

            {/* Ingredients */}
            {product.ingredients && (
              <div className="pt-3.5">
                <span className="text-[11px] text-[#71717A] flex items-center gap-1">
                  <Layers className="h-3 w-3" strokeWidth={1.75} />
                  Tarkibi va xomashyosi
                </span>
                <p className="mt-1 text-xs text-[#A1A1AA] leading-relaxed break-words">
                  {product.ingredients}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FEATURE A: AI Safety & Forensics Intelligence Box */}
        <div>
          {!aiAnalysis && !isAiLoading && (
            <div className="rounded-xl border border-[#1F1F23] bg-[#050507] p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                <div className="text-left">
                  <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <AiCoreIcon className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
                    <span>AslCheck Yordamchi • Tarkib Ekspertizasi</span>
                  </div>
                  <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                    Mahsulot tarkibi, yaroqlilik muddati va nusxalanish ehtimolini sunʼiy intellekt orqali chuqur tekshiring
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  className="flex items-center justify-center space-x-2 rounded-xl border border-[#27272A] bg-black/60 hover:bg-[#141418] hover:border-zinc-500 px-4 py-2.5 text-xs font-medium text-white transition-colors shrink-0 min-h-[40px]"
                >
                  <AiCoreIcon className="h-3.5 w-3.5 text-indigo-400" strokeWidth={1.75} />
                  <span>AI bilan tahlil qilish</span>
                </button>
              </div>
            </div>
          )}

          {isAiLoading && (
            <div className="rounded-xl border border-[#1F1F23] bg-[#050507] p-6 text-center animate-pulse">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
              <div className="text-xs font-semibold text-white">
                AslCheck Yordamchi tahlil qilmoqda...
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">
                Tarkib, qolgan yaroqlilik kunlari va kontrafakt indeksi hisoblanmoqda
              </div>
            </div>
          )}

          {aiAnalysis && (
            <div className="relative overflow-hidden rounded-xl border border-[#1F1F23] bg-[#050507] p-4 sm:p-5 space-y-4 shadow-[0_18px_45px_rgba(0,0,0,0.75)] animate-in fade-in duration-300">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-[#18181B]">
                <div className="flex items-center space-x-2">
                  <AiCoreIcon className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
                  <h3 className="text-xs font-semibold text-white tracking-tight">
                    AI Xavfsizlik va Tarkib Ekspertizasi
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {typeof aiAnalysis.days_until_expiry === 'number' && (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-medium border ${
                        aiAnalysis.days_until_expiry < 0
                          ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                          : aiAnalysis.days_until_expiry <= 30
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                          : 'bg-black border-[#1F1F23] text-[#A1A1AA]'
                      }`}
                    >
                      {aiAnalysis.days_until_expiry < 0
                        ? `Muddati ${Math.abs(aiAnalysis.days_until_expiry)} kun o‘tgan`
                        : `Muddatiga ${aiAnalysis.days_until_expiry} kun`}
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${
                      aiAnalysis.safety_score === 'Yuqori'
                        ? 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]'
                        : aiAnalysis.safety_score === 'Past'
                        ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                        : 'bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]'
                    }`}
                  >
                    <span>Xavfsizlik: {aiAnalysis.safety_score}</span>
                  </span>

                  {/* Audio reader button for AI analysis */}
                  <AudioPlayerButton
                    text={`${aiAnalysis.authenticity_verdict}. ${aiAnalysis.ingredients_summary}. Amaliy tavsiya: ${aiAnalysis.buyer_tip}`}
                    id={`ai-product-analysis-${product.id}`}
                    label="AI xulosasini tinglash"
                    variant="pill"
                  />
                </div>
              </div>

              {/* Precision Segmented Trust Score Meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono uppercase tracking-wider text-[#71717A]">
                    Ishonch Indeksi
                  </span>
                  <span className="font-mono font-bold text-white tabular-nums">
                    {aiAnalysis.trust_score} <span className="text-[#71717A] font-normal">/ 100</span>
                  </span>
                </div>

                {/* 10-segment precision gauge */}
                <div className="grid grid-cols-10 gap-1" aria-label={`Trust score ${aiAnalysis.trust_score} out of 100`}>
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const segThreshold = (idx + 1) * 10;
                    const prevThreshold = idx * 10;
                    const score = Math.max(0, Math.min(100, aiAnalysis.trust_score));
                    const isFilled = score >= segThreshold;
                    const isPartial = !isFilled && score > prevThreshold;
                    const activeColor =
                      score >= 75
                        ? 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.45)]'
                        : score >= 45
                        ? 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        : 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.45)]';

                    return (
                      <div
                        key={idx}
                        className="h-2 overflow-hidden rounded-[3px] bg-black border border-[#1F1F23]"
                      >
                        {(isFilled || isPartial) && (
                          <div
                            className={`h-full transition-all duration-500 ${activeColor}`}
                            style={{
                              width: isFilled ? '100%' : `${((score - prevThreshold) / 10) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1">
                    Tarkib va Allergen Tahlili
                  </span>
                  <p className="text-[#A1A1AA] leading-relaxed break-words">
                    {aiAnalysis.ingredients_summary}
                  </p>
                  {aiAnalysis.ingredient_tags && aiAnalysis.ingredient_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {aiAnalysis.ingredient_tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-[#1F1F23] bg-black px-2 py-0.5 text-[10px] font-mono text-[#A1A1AA]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-[#18181B]">
                  <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1">
                    Asllik va Kontrafakt Xulosasi
                  </span>
                  <p className="text-[#A1A1AA] leading-relaxed break-words">
                    {aiAnalysis.authenticity_verdict}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#18181B]">
                  <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1">
                    Xaridor Uchun Amaliy Tavsiya
                  </span>
                  <p className="text-white font-medium leading-relaxed break-words">
                    {aiAnalysis.buyer_tip}
                  </p>
                </div>

                {aiAnalysis.physical_checks && aiAnalysis.physical_checks.length > 0 && (
                  <div className="pt-2.5 border-t border-[#18181B]">
                    <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1.5">
                      Jismoniy Tekshiruv Nazorat Ro‘yxati
                    </span>
                    <ul className="space-y-1 text-[11px] text-[#A1A1AA]">
                      {aiAnalysis.physical_checks.map((chk, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0 mt-0.5" strokeWidth={2} />
                          <span className="break-words">{chk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {onAskAiAboutProduct && (
                  <div className="pt-3 border-t border-[#18181B] flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onAskAiAboutProduct(
                          `Menda "${product.product_name}" mahsuloti bor (Kodi: ${product.serial_code}). Tarkibi: ${product.ingredients || 'ko\'rsatilmagan'}. Ushbu mahsulotning tabiiyligi va haqiqiyligi bo'yicha yana nimalarga e'tibor berishim kerak?`
                        )
                      }
                      className="inline-flex items-center space-x-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
                    >
                      <AiCoreIcon className="h-3.5 w-3.5 text-indigo-400" strokeWidth={1.75} />
                      <span>AslCheck Yordamchi bilan to‘liq muloqot qilish →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manufacturer Card */}
        {manufacturer && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-3">
              Rasmiy Ishlab Chiqaruvchi
            </h3>

            <div className="rounded-xl border border-[#1F1F23] bg-[#050507] p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1F1F23] bg-black text-white">
                    <Building2 className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-white break-words">
                        {manufacturer.name}
                      </span>
                      {manufacturer.verified && (
                        <span className="flex items-center space-x-1 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#10B981]">
                          <VerifiedSealIcon className="h-3 w-3" strokeWidth={1.75} />
                          <span>Tasdiqlangan</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center space-x-1 text-xs text-[#71717A]">
                      <MapPin className="h-3 w-3 text-[#52525B]" strokeWidth={1.75} />
                      <span>{manufacturer.region}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-[#18181B] flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1">
                <span className="text-[#71717A]">Davlat litsenziyasi:</span>
                <span className="font-mono text-white bg-black px-2.5 py-0.5 rounded-md border border-[#1F1F23] break-all self-start sm:self-auto">
                  {manufacturer.license_number}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scan History Timeline */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717A] flex items-center space-x-1.5">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>So‘nggi tekshiruvlar tarixi (Oxirgi 5 ta)</span>
            </h3>
            <span className="text-[11px] font-mono text-[#71717A] tabular-nums">
              Jami: {product.scan_count} marta
            </span>
          </div>

          <div className="rounded-xl border border-[#1F1F23] bg-[#050507] p-3 space-y-2">
            {logs && logs.length > 0 ? (
              logs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-lg border text-xs gap-1.5 ${
                    log.is_report
                      ? 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                      : 'border-[#18181B] bg-black/60 text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {log.is_report ? (
                      <Flag className="h-3.5 w-3.5 text-[#EF4444] shrink-0" strokeWidth={1.75} />
                    ) : (
                      <Smartphone className="h-3.5 w-3.5 text-[#71717A] shrink-0" strokeWidth={1.75} />
                    )}
                    <span className="font-medium">
                      {log.device_info || 'Nomaʼlum qurilma'}
                    </span>
                    {log.location_note && (
                      <span className="text-[#A1A1AA] text-[11px] break-words">
                        • {log.location_note}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-[#71717A] sm:text-right font-mono self-start sm:self-auto">
                    <span>
                      {new Date(log.scanned_at).toLocaleString('uz-UZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {log.is_report && (
                      <span className="rounded bg-[#EF4444]/20 px-1 py-0.5 text-[10px] text-[#EF4444] font-semibold">
                        Shikoyat
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-3 text-center text-xs text-[#71717A]">
                Bu mahsulotning birinchi rasmiy tekshiruvi.
              </div>
            )}
          </div>
        </div>

        {/* Counterfeit Report Section */}
        <div className="border-t border-[#18181B] pt-4">
          {!showReportForm && !reportSuccess && (
            <button
              type="button"
              onClick={() => setShowReportForm(true)}
              className="flex items-center justify-center space-x-2 w-full rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 hover:bg-[#EF4444]/10 py-3 text-xs font-medium text-[#EF4444] transition-colors min-h-[44px]"
            >
              <Flag className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Soxta mahsulot haqida xabar berish</span>
            </button>
          )}

          {showReportForm && !reportSuccess && (
            <form
              onSubmit={handleReportSubmit}
              className="rounded-xl border border-[#EF4444]/30 bg-[#050507] p-4 space-y-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <Flag className="h-3.5 w-3.5 text-[#EF4444]" strokeWidth={1.75} />
                  <span>Soxtalik yoki shubha haqida xabar berish</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="text-[11px] text-[#71717A] hover:text-white"
                >
                  Bekor qilish
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-[#71717A] mb-1">
                  Joylashuv yoki do‘kon nomi
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Chorsu bozori, 14-do‘kon yoki Toshkent sh., Chilonzor"
                  value={reportLocation}
                  onChange={(e) => setReportLocation(e.target.value)}
                  className="w-full rounded-xl border border-[#1F1F23] bg-black px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-white/40 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#71717A] mb-1">
                  Qisqa izoh yoki shubha sababi
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: Qadoqdagi shrift buzilgan, qopqoq plyonkasi yo‘q, narxi shubhali arzon..."
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  className="w-full rounded-xl border border-[#1F1F23] bg-black px-3 py-2 text-xs text-white placeholder-[#52525B] focus:border-white/40 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="rounded-lg border border-[#1F1F23] bg-black px-3.5 py-2 text-xs text-[#71717A] hover:text-white min-h-[36px]"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="flex items-center space-x-1.5 rounded-lg bg-[#EF4444] px-4 py-2 text-xs font-semibold text-white hover:bg-[#DC2626] disabled:opacity-50 transition-colors min-h-[36px]"
                >
                  <Send className="h-3 w-3" strokeWidth={1.75} />
                  <span>{isSubmittingReport ? 'Yuborilmoqda...' : 'Xabarni yuborish'}</span>
                </button>
              </div>
            </form>
          )}

          {reportSuccess && (
            <div className="flex items-center space-x-2 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3.5 text-xs text-[#10B981] animate-in fade-in duration-200">
              <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="leading-relaxed">
                Shikoyatingiz qabul qilindi. Ushbu mahsulot reyestrda shubhali sifatida belgilandi.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
