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
} from 'lucide-react';
import { AiCoreIcon, CloneAlertIcon, VerifiedSealIcon } from './Icons';
import type { VerificationResult, ScanLog } from '../types';
import { reportFakeProduct, claimProduct } from '../lib/api';
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
  
  // Ownership Claim state
  const [isClaimed, setIsClaimed] = useState<boolean>(Boolean(product?.is_claimed));
  const [claimedAt, setClaimedAt] = useState<string | null>(product?.claimed_at || null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);

  // Counterfeit Report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportLocation, setReportLocation] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Gemini AI Analysis state (Feature A)
  const [aiAnalysis, setAiAnalysis] = useState<ProductAiAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Automatic Expiry Date Check
  const isExpired = product?.expiry_date
    ? new Date(product.expiry_date).getTime() < new Date().setHours(0, 0, 0, 0)
    : false;

  // Handle Ownership Claim
  const handleClaim = async () => {
    if (!product || isClaiming || isClaimed) return;
    setIsClaiming(true);
    try {
      const res = await claimProduct(product.id);
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
      <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-xl border border-[#EF4444]/40 bg-[#0A0A0A] shadow-2xl animate-in fade-in duration-300">
        {/* Banner */}
        <div className="border-b border-[#EF4444]/30 bg-[#EF4444]/10 p-5 sm:p-6">
          <div className="flex items-start space-x-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]">
              <XCircle className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#EF4444]">
                Xavfsizlik Ogohlantirishi
              </span>
              <h2 className="mt-0.5 text-base sm:text-lg font-bold tracking-tight text-[#EF4444]">
                MAHSULOT TOPILMADI — SOXTA BO‘LISHI MUMKIN
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#888888]">
                Ushbu seriya kodi rasmiy AslCheck reyestrida mavjud emas. Mahsulot kontrafakt yoki noqonuniy nusxalangan bo‘lishi mumkin.
              </p>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="rounded-lg border border-[#1F1F1F] bg-[#050505] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#888888]">Tekshirilgan kod:</span>
              <span className="font-mono font-semibold text-[#FAFAFA] bg-[#141414] px-2 py-0.5 rounded border border-[#262626]">
                {searchedCode.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[#1F1F1F] bg-[#0D0D0D] p-4">
            <h4 className="text-xs font-semibold text-[#FAFAFA] flex items-center space-x-1.5">
              <AlertOctagon className="h-4 w-4 text-[#EF4444]" strokeWidth={1.75} />
              <span>Isteʼmolchi uchun tavsiyalar:</span>
            </h4>
            <ul className="mt-2 space-y-1.5 text-xs text-[#888888] list-disc list-inside">
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
    <div className="w-full max-w-2xl mx-auto overflow-hidden rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] shadow-2xl animate-in fade-in duration-300">
      {/* Top Status Banner */}
      <div
        className={`border-b p-5 sm:p-6 transition-colors ${
          isAuthentic
            ? 'border-[#10B981]/30 bg-[#10B981]/10'
            : 'border-[#F59E0B]/30 bg-[#F59E0B]/10'
        }`}
      >
        <div className="flex items-start space-x-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              isAuthentic
                ? 'border-[#10B981]/30 bg-[#10B981]/20 text-[#10B981]'
                : 'border-[#F59E0B]/30 bg-[#F59E0B]/20 text-[#F59E0B]'
            }`}
          >
            {isAuthentic ? (
              <CheckCircle className="h-6 w-6" strokeWidth={1.75} />
            ) : (
              <CloneAlertIcon className="h-6 w-6" strokeWidth={1.5} />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                  isAuthentic ? 'text-[#10B981]' : 'text-[#F59E0B]'
                }`}
              >
                {isAuthentic ? 'Asl Mahsulot Sertifikati' : 'Anti-Clone Ogohlantirish'}
              </span>
              <span className="h-1 w-1 rounded-full bg-[#525252]" />
              <span className="font-mono text-[11px] text-[#888888]">
                Skaner: {product.scan_count} / {product.max_safe_scans}
              </span>
            </div>

            <h2
              className={`mt-0.5 text-base sm:text-lg font-bold tracking-tight ${
                isAuthentic ? 'text-[#10B981]' : 'text-[#F59E0B]'
              }`}
            >
              {isAuthentic
                ? '100% HAQIQIY MAHSULOT'
                : 'DIQQAT! NUSXALANGAN KOD BO‘LISHI MUMKIN'}
            </h2>

            <p className="mt-1 text-xs sm:text-sm text-[#888888] leading-relaxed">
              {isAuthentic
                ? 'Ushbu mahsulot rasmiy ishlab chiqaruvchi tomonidan AslCheck davlat standartiga muvofiq ro‘yxatga olingan va xavfsiz chegarada tekshirildi.'
                : `Ushbu unikal kod ${product.scan_count} marta tekshirilgan. Xavfsiz chegara: ${product.max_safe_scans} marta. Bir nechta turli joylarda bir vaqtning o‘zida skaner qilinishi nusxalangan qadoq belgisidir.`}
            </p>
          </div>
        </div>
      </div>

      {/* Feature 3: Automatic Expiry Date Alert Banner */}
      {isExpired && (
        <div className="border-b border-[#EF4444]/40 bg-[#EF4444]/15 px-5 py-3.5 flex items-start space-x-3 text-xs text-[#EF4444]">
          <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <div className="font-bold tracking-tight">
              OGOHLANTIRISH: Mahsulot asl, lekin yaroqlilik muddati o‘tgan!
            </div>
            <p className="text-[#888888] mt-0.5">
              Belgilangan yaroqlilik sanasi ({product.expiry_date}) tugagan. Ushbu mahsulotni isteʼmol qilish yoki ishlatish sog‘liq uchun xavfli bo‘lishi mumkin.
            </p>
          </div>
        </div>
      )}

      {/* Feature 2: Smart Ownership Claim Status Banners */}
      {justClaimed && (
        <div className="border-b border-[#10B981]/30 bg-[#10B981]/15 px-5 py-3 flex items-center space-x-2.5 text-xs text-[#10B981] animate-in fade-in">
          <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span className="font-semibold">
            Ushbu mahsulot siz tomoningizdan faollashtirildi (Band qilindi).
          </span>
        </div>
      )}

      {isClaimed && !justClaimed && (
        <div className="border-b border-[#F59E0B]/30 bg-[#F59E0B]/10 px-5 py-3.5 flex items-start space-x-3 text-xs text-[#F59E0B]">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
          <div className="leading-relaxed">
            <span className="font-bold">DIQQAT!</span> Ushbu mahsulot avvalroq{' '}
            <span className="font-mono font-semibold underline">
              {claimedAt
                ? new Date(claimedAt).toLocaleString('uz-UZ', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'oldingi xaridor tomonidan'}
            </span>{' '}
            sotib olinib, faollashtirilgan. Agar bu rastadagi yopiq yangi qadoq bo‘lsa — qalbaki yoki nusxalangan bo‘lishi mumkin!
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-6">
        {/* Feature 2: Ownership Claim Action Button (when not yet claimed) */}
        {!isClaimed && (
          <div className="rounded-xl border border-[#1F1F1F] bg-[#0D0D0D] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[#FAFAFA] flex items-center space-x-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={2} />
                <span>Ushbu mahsulotni xarid qildingizmi?</span>
              </div>
              <p className="text-[11px] text-[#888888] mt-0.5">
                Kodni o‘zingizga band qiling — boshqa hech kim ushbu kodni qayta faollashtirolmaydi.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClaim}
              disabled={isClaiming}
              className="flex items-center justify-center space-x-2 rounded-lg bg-[#FAFAFA] px-4 py-2 text-xs font-bold text-black hover:bg-[#E5E5E5] disabled:opacity-50 transition-colors shrink-0 shadow-sm"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>{isClaiming ? 'Band qilinmoqda...' : 'Sotib oldim — Kodni band qilish'}</span>
            </button>
          </div>
        )}

        {/* Product Details Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
              Raqamli Mahsulot Pasporti
            </h3>
            <span className="font-mono text-xs text-[#FAFAFA] bg-[#141414] px-2 py-0.5 rounded border border-[#222222]">
              {product.serial_code}
            </span>
          </div>

          <div className="rounded-lg border border-[#1F1F1F] bg-[#050505] p-4 divide-y divide-[#141414]">
            {/* Name & Category */}
            <div className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <span className="text-[11px] text-[#525252]">Mahsulot nomi</span>
                <div className="text-sm font-semibold text-[#FAFAFA]">
                  {product.product_name}
                </div>
              </div>
              <div className="sm:text-right">
                <span className="text-[11px] text-[#525252]">Kategoriya</span>
                <div className="text-xs text-[#888888]">{product.category}</div>
              </div>
            </div>

            {/* Batch & Dates */}
            <div className="py-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-[#525252] flex items-center gap-1">
                  <Hash className="h-3 w-3" strokeWidth={1.75} />
                  Partiya raqami
                </span>
                <div className="font-mono text-xs font-medium text-[#FAFAFA] mt-0.5">
                  {product.batch_number}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#525252] flex items-center gap-1">
                  <Calendar className="h-3 w-3" strokeWidth={1.75} />
                  Ishlab chiqarilgan
                </span>
                <div className="font-mono text-xs text-[#FAFAFA] mt-0.5">
                  {product.manufacture_date}
                </div>
              </div>

              {/* Expiry Date (Highlighted if expired) */}
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[11px] text-[#525252] flex items-center gap-1">
                  <Clock className="h-3 w-3" strokeWidth={1.75} />
                  Yaroqlilik muddati
                </span>
                <div
                  className={`font-mono text-xs mt-0.5 ${
                    isExpired
                      ? 'text-[#EF4444] font-bold px-1.5 py-0.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 inline-block'
                      : 'text-[#FAFAFA]'
                  }`}
                >
                  {product.expiry_date} {isExpired ? '(Muddati o‘tgan)' : ''}
                </div>
              </div>
            </div>

            {/* Ingredients */}
            {product.ingredients && (
              <div className="pt-3">
                <span className="text-[11px] text-[#525252] flex items-center gap-1">
                  <Layers className="h-3 w-3" strokeWidth={1.75} />
                  Tarkibi va xomashyosi
                </span>
                <p className="mt-1 text-xs text-[#888888] leading-relaxed">
                  {product.ingredients}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FEATURE A: AI Safety & Forensics Intelligence Box */}
        <div>
          {!aiAnalysis && !isAiLoading && (
            <div className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#FAFAFA] flex items-center space-x-1.5">
                    <AiCoreIcon className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
                    <span>AI Tarkib va Xavfsizlik Ekspertizasi</span>
                  </div>
                  <p className="text-[11px] text-[#888888] mt-0.5">
                    Mahsulot tarkibi, yaroqlilik muddati va nusxalanish ehtimolini sunʼiy intellekt orqali chuqur tekshiring
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  className="flex items-center justify-center space-x-2 rounded-lg border border-[#262626] bg-[#141414] hover:bg-[#1C1C1C] hover:border-[#3A3A3A] px-4 py-2 text-xs font-medium text-[#FAFAFA] transition-colors shrink-0"
                >
                  <AiCoreIcon className="h-3.5 w-3.5 text-[#FAFAFA]" strokeWidth={1.5} />
                  <span>AI bilan tahlil qilish</span>
                </button>
              </div>
            </div>
          )}

          {isAiLoading && (
            <div className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-6 text-center animate-pulse">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#888888]" />
              <div className="text-xs font-semibold text-[#FAFAFA]">
                AslCheck AI tahlil qilmoqda...
              </div>
              <div className="text-[11px] text-[#525252] mt-0.5">
                Tarkib, qolgan yaroqlilik kunlari va kontrafakt indeksi hisoblanmoqda
              </div>
            </div>
          )}

          {aiAnalysis && (
            <div className="rounded-xl border border-[#222222] bg-[#0A0A0A] p-5 space-y-4 shadow-xl animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#141414]">
                <div className="flex items-center space-x-2">
                  <AiCoreIcon className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-[#FAFAFA] tracking-tight">
                    AI Xavfsizlik va Tarkib Ekspertizasi
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  {typeof aiAnalysis.days_until_expiry === 'number' && (
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono font-medium border ${
                        aiAnalysis.days_until_expiry < 0
                          ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                          : aiAnalysis.days_until_expiry <= 30
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                          : 'bg-[#141414] border-[#262626] text-[#888888]'
                      }`}
                    >
                      {aiAnalysis.days_until_expiry < 0
                        ? `Muddati ${Math.abs(aiAnalysis.days_until_expiry)} kun o‘tgan`
                        : `Muddatiga ${aiAnalysis.days_until_expiry} kun`}
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center space-x-1 rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                      aiAnalysis.safety_score === 'Yuqori'
                        ? 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]'
                        : aiAnalysis.safety_score === 'Past'
                        ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                        : 'bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]'
                    }`}
                  >
                    <span>Xavfsizlik: {aiAnalysis.safety_score}</span>
                  </span>
                </div>
              </div>

              {/* Trust Score Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono uppercase tracking-wider text-[#525252]">
                    Ishonchlilik Indeksi (Trust Score)
                  </span>
                  <span className="font-mono font-bold text-[#FAFAFA]">
                    {aiAnalysis.trust_score} / 100
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#141414]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      aiAnalysis.trust_score >= 75
                        ? 'bg-[#10B981]'
                        : aiAnalysis.trust_score >= 45
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#EF4444]'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, aiAnalysis.trust_score))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1">
                    Tarkib va Allergen Tahlili
                  </span>
                  <p className="text-[#888888] leading-relaxed">
                    {aiAnalysis.ingredients_summary}
                  </p>
                  {aiAnalysis.ingredient_tags && aiAnalysis.ingredient_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {aiAnalysis.ingredient_tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded border border-[#222222] bg-[#111111] px-2 py-0.5 text-[10px] font-mono text-[#888888]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#141414]">
                  <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1">
                    Asllik va Kontrafakt Xulosasi
                  </span>
                  <p className="text-[#888888] leading-relaxed">
                    {aiAnalysis.authenticity_verdict}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#141414]">
                  <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1">
                    Xaridor Uchun Amaliy Tavsiya
                  </span>
                  <p className="text-[#FAFAFA] font-medium leading-relaxed">
                    {aiAnalysis.buyer_tip}
                  </p>
                </div>

                {aiAnalysis.physical_checks && aiAnalysis.physical_checks.length > 0 && (
                  <div className="pt-2 border-t border-[#141414]">
                    <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1.5">
                      Jismoniy Tekshiruv Nazorat Ro‘yxati
                    </span>
                    <ul className="space-y-1 text-[11px] text-[#888888]">
                      {aiAnalysis.physical_checks.map((chk, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <Check className="h-3.5 w-3.5 text-[#10B981] shrink-0 mt-0.5" strokeWidth={2} />
                          <span>{chk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {onAskAiAboutProduct && (
                  <div className="pt-3 border-t border-[#141414] flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onAskAiAboutProduct(
                          `Menda "${product.product_name}" mahsuloti bor (Kodi: ${product.serial_code}). Tarkibi: ${product.ingredients || 'ko\'rsatilmagan'}. Ushbu mahsulotning tabiiyligi va haqiqiyligi bo'yicha yana nimalarga e'tibor berishim kerak?`
                        )
                      }
                      className="inline-flex items-center space-x-1.5 text-xs text-[#10B981] hover:text-[#FAFAFA] transition-colors"
                    >
                      <AiCoreIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>AI Ekspert bilan to‘liq muloqot qilish →</span>
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-3">
              Rasmiy Ishlab Chiqaruvchi
            </h3>

            <div className="rounded-lg border border-[#1F1F1F] bg-[#050505] p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] text-[#FAFAFA]">
                    <Building2 className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-[#FAFAFA]">
                        {manufacturer.name}
                      </span>
                      {manufacturer.verified && (
                        <span className="flex items-center space-x-1 rounded border border-[#10B981]/30 bg-[#10B981]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#10B981]">
                          <VerifiedSealIcon className="h-3 w-3" strokeWidth={1.75} />
                          <span>Tasdiqlangan</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center space-x-1 text-xs text-[#888888]">
                      <MapPin className="h-3 w-3 text-[#525252]" strokeWidth={1.75} />
                      <span>{manufacturer.region}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#141414] flex items-center justify-between text-xs">
                <span className="text-[#525252]">Davlat litsenziyasi:</span>
                <span className="font-mono text-[#FAFAFA] bg-[#111111] px-2 py-0.5 rounded border border-[#1F1F1F]">
                  {manufacturer.license_number}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scan History Timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888] flex items-center space-x-1.5">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>So‘nggi tekshiruvlar tarixi (Oxirgi 5 ta)</span>
            </h3>
            <span className="text-[11px] font-mono text-[#525252]">
              Jami: {product.scan_count} marta
            </span>
          </div>

          <div className="rounded-lg border border-[#1F1F1F] bg-[#050505] p-3 space-y-2">
            {logs && logs.length > 0 ? (
              logs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-md border text-xs gap-1.5 ${
                    log.is_report
                      ? 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                      : 'border-[#141414] bg-[#0A0A0A] text-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {log.is_report ? (
                      <Flag className="h-3.5 w-3.5 text-[#EF4444] shrink-0" strokeWidth={1.75} />
                    ) : (
                      <Smartphone className="h-3.5 w-3.5 text-[#888888] shrink-0" strokeWidth={1.75} />
                    )}
                    <span className="font-medium">
                      {log.device_info || 'Nomaʼlum qurilma'}
                    </span>
                    {log.location_note && (
                      <span className="text-[#888888] text-[11px]">
                        • {log.location_note}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-[#525252] sm:text-right font-mono">
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
              <div className="py-3 text-center text-xs text-[#525252]">
                Bu mahsulotning birinchi rasmiy tekshiruvi.
              </div>
            )}
          </div>
        </div>

        {/* Counterfeit Report Section */}
        <div className="border-t border-[#1F1F1F] pt-4">
          {!showReportForm && !reportSuccess && (
            <button
              type="button"
              onClick={() => setShowReportForm(true)}
              className="flex items-center justify-center space-x-2 w-full rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 hover:bg-[#EF4444]/10 py-2.5 text-xs font-medium text-[#EF4444] transition-colors"
            >
              <Flag className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Soxta mahsulot haqida xabar berish</span>
            </button>
          )}

          {showReportForm && !reportSuccess && (
            <form
              onSubmit={handleReportSubmit}
              className="rounded-lg border border-[#EF4444]/30 bg-[#0D0D0D] p-4 space-y-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#FAFAFA] flex items-center space-x-1.5">
                  <Flag className="h-3.5 w-3.5 text-[#EF4444]" strokeWidth={1.75} />
                  <span>Soxtalik yoki shubha haqida xabar berish</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="text-[11px] text-[#888888] hover:text-[#FAFAFA]"
                >
                  Bekor qilish
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  Joylashuv yoki do‘kon nomi
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Chorsu bozori, 14-do‘kon yoki Toshkent sh., Chilonzor"
                  value={reportLocation}
                  onChange={(e) => setReportLocation(e.target.value)}
                  className="w-full rounded-md border border-[#1F1F1F] bg-[#050505] px-3 py-1.5 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  Qisqa izoh yoki shubha sababi
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: Qadoqdagi shrift buzilgan, qopqoq plyonkasi yo‘q, narxi shubhali arzon..."
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  className="w-full rounded-md border border-[#1F1F1F] bg-[#050505] px-3 py-1.5 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="rounded-md border border-[#1F1F1F] bg-[#141414] px-3 py-1.5 text-xs text-[#888888] hover:text-[#FAFAFA]"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="flex items-center space-x-1.5 rounded-md bg-[#EF4444] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#DC2626] disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3 w-3" strokeWidth={1.75} />
                  <span>{isSubmittingReport ? 'Yuborilmoqda...' : 'Xabarni yuborish'}</span>
                </button>
              </div>
            </form>
          )}

          {reportSuccess && (
            <div className="flex items-center space-x-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#10B981] animate-in fade-in duration-200">
              <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>
                Shikoyatingiz qabul qilindi. Ushbu mahsulot reyestrda shubhali sifatida belgilandi.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
