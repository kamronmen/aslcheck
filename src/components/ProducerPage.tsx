import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  QrCode,
  CheckCircle2,
  Search,
  RefreshCw,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
  LogOut,
  Trash2,
  MapPin,
  Clock,
  Smartphone,
  BarChart3,
} from 'lucide-react';
import type {
  Manufacturer,
  ProductWithManufacturer,
  NewProductPayload,
  ReportWithProduct,
  ScanTrendPoint,
} from '../types';
import {
  restoreProducerSession,
  logoutProducerAccount,
  fetchProducerProducts,
  createBatchProducts,
  deleteProduct,
  fetchReports,
  fetchScanTrend,
} from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateProducerAiReport, type ProducerAiReport } from '../lib/ai';
import { ProducerAuth } from './ProducerAuth';
import { QrLabelCard } from './QrLabelCard';
import { BatchQrModal } from './BatchQrModal';
import {
  AiCoreIcon,
  VerifiedSealIcon,
  CloneAlertIcon,
  BatchGridIcon,
  ShieldRadarIcon,
} from './Icons';

export const ProducerPage: React.FC = () => {
  // Multi-Tenant Session State
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentManufacturer, setCurrentManufacturer] = useState<Manufacturer | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Tab State: 'products' | 'reports'
  const [activeSection, setActiveSection] = useState<'products' | 'reports'>('products');

  // Tenant-Isolated Products, Reports & 7-Day Trend State
  const [products, setProducts] = useState<ProductWithManufacturer[]>([]);
  const [reports, setReports] = useState<ReportWithProduct[]>([]);
  const [scanTrend, setScanTrend] = useState<ScanTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // AI Executive Report State
  const [aiReport, setAiReport] = useState<ProducerAiReport | null>(null);
  const [isAiReportLoading, setIsAiReportLoading] = useState(false);

  // Modals
  const [selectedProductForQr, setSelectedProductForQr] = useState<ProductWithManufacturer | null>(null);
  const [batchCreatedProducts, setBatchCreatedProducts] = useState<ProductWithManufacturer[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Form State
  const generateRandomSerial = () => `ASL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Oziq-ovqat');
  const [formBatch, setFormBatch] = useState('BATCH-2026-N1');
  const [formManufactureDate, setFormManufactureDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formExpiryDate, setFormExpiryDate] = useState(
    new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0]
  );
  const [formIngredients, setFormIngredients] = useState('');
  const [formMaxSafeScans, setFormMaxSafeScans] = useState(3);
  const [formQuantity, setFormQuantity] = useState(1);
  const [formSerialCode, setFormSerialCode] = useState(generateRandomSerial());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check active session on mount
  useEffect(() => {
    let active = true;
    const initSession = async () => {
      setIsCheckingSession(true);
      try {
        const restored = await restoreProducerSession();
        if (active && restored) {
          setCurrentManufacturer(restored.manufacturer);
          setIsDemoMode(restored.isDemo);
        }
      } finally {
        if (active) setIsCheckingSession(false);
      }
    };
    initSession();

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          setCurrentManufacturer(null);
          setIsDemoMode(false);
          setProducts([]);
          setReports([]);
          setScanTrend([]);
          setAiReport(null);
        }
      });
      return () => {
        active = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
    };
  }, []);

  // Load Tenant-Isolated Data
  const loadData = useCallback(async () => {
    if (!currentManufacturer) return;
    setIsLoading(true);
    try {
      const [items, reps, trend] = await Promise.all([
        fetchProducerProducts(currentManufacturer.id),
        fetchReports(currentManufacturer.id),
        fetchScanTrend(currentManufacturer.id, 7),
      ]);
      setProducts(items);
      setReports(reps);
      setScanTrend(trend);
    } catch (err) {
      console.error('Failed to load producer data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentManufacturer]);

  const refreshReports = async () => {
    if (!currentManufacturer) return;
    setIsReportsLoading(true);
    try {
      const reps = await fetchReports(currentManufacturer.id);
      setReports(reps);
    } catch (err) {
      console.error('Failed to refresh reports:', err);
    } finally {
      setIsReportsLoading(false);
    }
  };

  useEffect(() => {
    if (currentManufacturer) {
      setAiReport(null);
      loadData();
    }
  }, [currentManufacturer, loadData]);

  // Calculate KPIs strictly for currentManufacturer
  const totalProducts = products.length;
  const totalScans = products.reduce((acc, p) => acc + (p.scan_count || 0), 0);
  const suspiciousCount = products.filter(
    (p) => p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3)
  ).length;

  // Run Tenant-Isolated AI Risk Report
  const handleRunProducerAiReport = async () => {
    if (!currentManufacturer || isAiReportLoading) return;
    setIsAiReportLoading(true);
    try {
      const report = await generateProducerAiReport({
        company_name: currentManufacturer.name,
        region: currentManufacturer.region,
        license_number: currentManufacturer.license_number,
        total_products: totalProducts,
        total_scans: totalScans,
        suspicious_count: suspiciousCount,
        products_summary: products.slice(0, 20).map((p) => ({
          serial_code: p.serial_code,
          product_name: p.product_name,
          scan_count: p.scan_count || 0,
          max_safe_scans: p.max_safe_scans || 3,
          is_flagged: Boolean(p.is_flagged),
        })),
        reports: reports.slice(0, 15).map((r) => ({
          serial_code: r.product?.serial_code || 'NOMAʼLUM',
          product_name: r.product?.product_name || 'Mahsulot',
          location_note: r.location_note,
          report_message: r.report_message,
          scanned_at: r.scanned_at,
        })),
      });
      setAiReport(report);
    } catch (err) {
      console.error('Failed to run AI risk report:', err);
    } finally {
      setIsAiReportLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutProducerAccount();
    setCurrentManufacturer(null);
    setIsDemoMode(false);
    setProducts([]);
    setReports([]);
    setScanTrend([]);
    setAiReport(null);
    setShowAddForm(false);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!currentManufacturer) return;
    if (window.confirm(`"${productName}" mahsulotini o‘chirmoqchimisiz?`)) {
      await deleteProduct(productId, currentManufacturer.id);
      await loadData();
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentManufacturer || !formName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: NewProductPayload = {
        product_name: formName.trim(),
        category: formCategory,
        batch_number: formBatch.trim() || 'BATCH-2026-X1',
        manufacture_date: formManufactureDate,
        expiry_date: formExpiryDate,
        ingredients: formIngredients.trim() || undefined,
        max_safe_scans: Number(formMaxSafeScans) || 3,
        serial_code: formSerialCode.trim().toUpperCase(),
      };

      const quantity = Math.max(1, Math.min(20, Number(formQuantity) || 1));
      const createdItems = await createBatchProducts(payload, quantity, currentManufacturer);

      setFormName('');
      setFormIngredients('');
      setFormBatch(`BATCH-2026-${Math.floor(10 + Math.random() * 90)}`);
      setFormSerialCode(generateRandomSerial());
      setFormQuantity(1);
      setShowAddForm(false);

      await loadData();

      if (createdItems.length > 1) {
        setBatchCreatedProducts(createdItems);
        setIsBatchModalOpen(true);
      } else if (createdItems.length === 1) {
        setSelectedProductForQr(createdItems[0]);
      }
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Session Check
  if (isCheckingSession) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#888888]" />
        <p className="mt-3 text-xs text-[#888888]">Korxona sessiyasi tekshirilmoqda...</p>
      </div>
    );
  }

  // Auth Gate when unauthenticated
  if (!currentManufacturer) {
    return (
      <ProducerAuth
        onAuthenticated={(manufacturer, demo) => {
          setCurrentManufacturer(manufacturer);
          setIsDemoMode(demo);
        }}
      />
    );
  }

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.product_name.toLowerCase().includes(term) ||
      p.serial_code.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.batch_number.toLowerCase().includes(term)
    );
  });

  const maxTrendValue = Math.max(
    1,
    ...scanTrend.map((d) => d.scans + d.reports)
  );
  const total7DayScans = scanTrend.reduce((sum, d) => sum + d.scans + d.reports, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Multi-Tenant Producer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1F1F1F]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FAFAFA]">
              {currentManufacturer.name}
            </h1>
            {currentManufacturer.verified && (
              <span className="inline-flex items-center space-x-1 rounded border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-medium text-[#10B981]">
                <VerifiedSealIcon className="h-3 w-3" strokeWidth={1.75} />
                <span>Tasdiqlangan</span>
              </span>
            )}
            {isDemoMode && (
              <span className="rounded border border-[#262626] bg-[#141414] px-2 py-0.5 text-[10px] font-mono text-[#888888]">
                DEMO REJIM
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#888888]">
            <span className="inline-flex items-center space-x-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#525252]" strokeWidth={1.75} />
              <span>{currentManufacturer.region}</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 font-mono text-[11px]">
              <span className="text-[#525252]">Litsenziya:</span>
              <span className="text-[#FAFAFA]">{currentManufacturer.license_number}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (!showAddForm) setFormSerialCode(generateRandomSerial());
            }}
            className="flex items-center justify-center space-x-2 rounded-lg bg-[#FAFAFA] px-4 py-2 text-xs font-semibold text-black hover:bg-[#E5E5E5] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span>Yangi Mahsulot Qo‘shish</span>
            {showAddForm ? (
              <ChevronUp className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Kabinetdan chiqish"
            className="flex items-center space-x-1.5 rounded-lg border border-[#1F1F1F] bg-[#111111] px-3 py-2 text-xs font-medium text-[#888888] hover:text-[#FAFAFA] hover:bg-[#161616] transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Chiqish</span>
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-medium">Jami mahsulotlar</span>
            <Package className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono text-[#FAFAFA]">
              {totalProducts}
            </span>
            <span className="text-xs text-[#525252]">ta ro‘yxatda</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-medium">Jami tekshiruvlar</span>
            <Layers className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono text-[#FAFAFA]">
              {totalScans}
            </span>
            <span className="text-xs text-[#525252]">marta skanerlandi</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-medium">Shubhali / Shikoyatlar</span>
            <CloneAlertIcon className="h-4 w-4 text-[#F59E0B]" strokeWidth={1.5} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono text-[#F59E0B]">
              {suspiciousCount}
            </span>
            <span className="text-xs text-[#525252]">ta ogohlantirish</span>
          </div>
        </div>
      </div>

      {/* 7-Day Tenant-Isolated Scan Activity Chart */}
      <div className="mt-4 rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-[#888888]" strokeWidth={1.75} />
            <h2 className="text-xs font-semibold tracking-tight text-[#FAFAFA]">
              7-Kunlik Skanerlash Faolligi
            </h2>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-mono text-[#525252]">
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#10B981]" />
              <span>Tekshiruv</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#EF4444]" />
              <span>Shikoyat</span>
            </span>
            <span className="text-[#888888]">Jami: {total7DayScans}</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-28 pt-2">
          {scanTrend.map((point) => {
            const totalDay = point.scans + point.reports;
            const scanPct = Math.round((point.scans / maxTrendValue) * 100);
            const reportPct = Math.round((point.reports / maxTrendValue) * 100);

            return (
              <div key={point.date} className="flex flex-col items-center h-full justify-end">
                <span className="text-[10px] font-mono text-[#888888] mb-1">
                  {totalDay}
                </span>
                <div className="w-full max-w-[36px] h-16 rounded-md bg-[#111111] border border-[#1A1A1A] flex flex-col justify-end overflow-hidden p-0.5 gap-0.5">
                  {point.reports > 0 && (
                    <div
                      className="w-full rounded-sm bg-[#EF4444]"
                      style={{ height: `${Math.max(10, reportPct)}%` }}
                    />
                  )}
                  {point.scans > 0 && (
                    <div
                      className="w-full rounded-sm bg-[#10B981]"
                      style={{ height: `${Math.max(10, scanPct)}%` }}
                    />
                  )}
                </div>
                <span className="mt-1.5 text-[10px] font-mono text-[#525252]">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible Add Product Form (Single or Batch) */}
      {showAddForm && (
        <div className="mt-6 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-5 sm:p-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F]">
            <div className="flex items-center space-x-2">
              <BatchGridIcon className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.5} />
              <h2 className="text-sm font-semibold text-[#FAFAFA]">
                Yangi mahsulotni ro‘yxatga olish (Bitta yoki Partiya)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#888888] hover:text-[#FAFAFA]"
            >
              Bekor qilish
            </button>
          </div>

          <form onSubmit={handleAddProduct} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Mahsulot nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Tabiiy Tog' Asali (1 kg)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Kategoriya
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 text-xs text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none"
                >
                  <option value="Oziq-ovqat">Oziq-ovqat</option>
                  <option value="Salomatlik">Salomatlik</option>
                  <option value="Ichimlik">Ichimlik</option>
                  <option value="Kosmetika">Kosmetika</option>
                  <option value="Hunarmandchilik">Hunarmandchilik</option>
                  <option value="Boshqa">Boshqa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#FAFAFA] mb-1.5 flex items-center justify-between">
                  <span>Miqdori (nechta unikal QR-kod yaratilsin?) *</span>
                  <span className="text-[10px] text-[#888888]">1 dan 20 gacha</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#262626] bg-[#000000] px-3.5 py-2 font-mono text-xs font-bold text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-[#525252]">
                  {formQuantity > 1
                    ? `Partiya uchun ${formQuantity} ta unikal seriya raqami va A4 varaqasi yaratiladi.`
                    : '1 ta alohida mahsulot yorlig‘i yaratiladi.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Partiya raqami *
                </label>
                <input
                  type="text"
                  required
                  placeholder="BATCH-2026-N1"
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 font-mono text-xs text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Ishlab chiqarilgan sana
                </label>
                <input
                  type="date"
                  required
                  value={formManufactureDate}
                  onChange={(e) => setFormManufactureDate(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 text-xs text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Yaroqlilik muddati
                </label>
                <input
                  type="date"
                  required
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 text-xs text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Xavfsiz skanerlar chegarasi (Anti-Clone chegara)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formMaxSafeScans}
                  onChange={(e) => setFormMaxSafeScans(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 font-mono text-xs text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-[#525252]">
                  Ushbu sondan ko‘p skaner qilinganda nusxalangan deb belgilanadi (standart: 3 marta).
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Mahsulot tarkibi va maʼlumotlari
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: 100% tabiiy tog' nektari, toza biologik mahsulot..."
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#1F1F1F] flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-[#1F1F1F] bg-[#141414] px-4 py-2 text-xs font-medium text-[#888888] hover:text-[#FAFAFA] transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 rounded-lg bg-[#FAFAFA] px-4 py-2 text-xs font-semibold text-black hover:bg-[#E5E5E5] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Yaratilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>
                      {formQuantity > 1
                        ? `${formQuantity} ta QR-kod va A4 varaq yaratish`
                        : 'Saqlash va QR-kod yaratish'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Tab Navigation: Products vs Reports Radar */}
      <div className="mt-8 flex border-b border-[#1F1F1F]">
        <button
          type="button"
          onClick={() => setActiveSection('products')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === 'products'
              ? 'border-[#FAFAFA] text-[#FAFAFA]'
              : 'border-transparent text-[#888888] hover:text-[#FAFAFA]'
          }`}
        >
          <Package className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Mahsulotlar Ro‘yxati</span>
          <span className="rounded bg-[#141414] px-1.5 py-0.5 text-[10px] font-mono text-[#888888]">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('reports')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === 'reports'
              ? 'border-[#EF4444] text-[#EF4444]'
              : 'border-transparent text-[#888888] hover:text-[#FAFAFA]'
          }`}
        >
          <ShieldRadarIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Kelib tushgan shikoyatlar</span>
          {reports.length > 0 && (
            <span className="rounded bg-[#EF4444]/20 border border-[#EF4444]/30 px-1.5 py-0.2 text-[10px] font-mono font-bold text-[#EF4444]">
              {reports.length} ta
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: PRODUCTS TABLE */}
      {activeSection === 'products' && (
        <div className="mt-4 rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-[#1F1F1F] gap-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold tracking-tight text-[#FAFAFA]">
                Ro‘yxatga Olingan Mahsulotlar
              </h2>
              <span className="rounded bg-[#141414] border border-[#222222] px-2 py-0.5 text-[11px] font-mono text-[#888888]">
                {filteredProducts.length} ta
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#525252]" />
                <input
                  type="text"
                  placeholder="Qidirish (seriya, nom, partiya)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-1.5 pl-8 pr-3 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={loadData}
                title="Yangilash"
                className="p-1.5 rounded-lg border border-[#1F1F1F] bg-[#141414] text-[#888888] hover:text-[#FAFAFA] transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#1F1F1F] bg-[#050505] text-[#525252] font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Seriya Kodi</th>
                  <th className="px-4 py-3">Mahsulot Nomi</th>
                  <th className="px-4 py-3 hidden md:table-cell">Kategoriya</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Partiya</th>
                  <th className="px-4 py-3">Skaner</th>
                  <th className="px-4 py-3">Bandligi</th>
                  <th className="px-4 py-3">Holati</th>
                  <th className="px-4 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414] text-[#FAFAFA]">
                {isLoading && products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#525252]">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#888888]" />
                      <span>Mahsulotlar yuklanmoqda...</span>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[#525252]">
                      Ushbu korxona hisobida hozircha mahsulotlar mavjud emas. Yangi mahsulot qo‘shing.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isSuspicious =
                      p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3);

                    return (
                      <tr key={p.id} className="hover:bg-[#111111] transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-[#FAFAFA]">
                          <span className="rounded bg-[#141414] border border-[#222222] px-2 py-0.5">
                            {p.serial_code}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-medium">
                          <div>{p.product_name}</div>
                          <div className="text-[10px] text-[#525252] sm:hidden mt-0.5">
                            {p.batch_number} • {p.category}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-[#888888] hidden md:table-cell">
                          {p.category}
                        </td>

                        <td className="px-4 py-3 font-mono text-[#888888] hidden sm:table-cell">
                          {p.batch_number}
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <span
                            className={
                              isSuspicious
                                ? 'text-[#F59E0B] font-bold'
                                : 'text-[#10B981]'
                            }
                          >
                            {p.scan_count || 0}
                          </span>
                          <span className="text-[#525252]">
                            {' '}
                            / {p.max_safe_scans || 3}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {p.is_claimed ? (
                            <span className="inline-flex items-center space-x-1 rounded border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#60A5FA]">
                              <span>Band qilingan</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#525252]">Erkin</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isSuspicious ? (
                            <span className="inline-flex items-center space-x-1 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                              <CloneAlertIcon className="h-3 w-3" strokeWidth={1.5} />
                              <span>Shubhali</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 rounded border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                              <span>Faol</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedProductForQr(p)}
                              className="inline-flex items-center space-x-1.5 rounded-md border border-[#222222] bg-[#141414] px-2.5 py-1 text-xs font-medium text-[#FAFAFA] hover:bg-[#1E1E1E] transition-colors"
                            >
                              <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
                              <span>QR-kod</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.product_name)}
                              title="Mahsulotni o‘chirish"
                              className="p-1 rounded-md text-[#525252] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: LIVE COUNTERFEIT REPORTS RADAR + AI EXECUTIVE REPORT */}
      {activeSection === 'reports' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-[#FAFAFA] flex items-center space-x-2">
                <ShieldRadarIcon className="h-4 w-4 text-[#EF4444]" strokeWidth={1.5} />
                <span>Jonli Shikoyatlar va Soxtalik Signallari</span>
              </h2>
              <p className="text-xs text-[#888888] mt-0.5">
                Faqat {currentManufacturer.name} mahsulotlari bo‘yicha kelib tushgan real vaqt signallari
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleRunProducerAiReport}
                disabled={isAiReportLoading}
                className="flex items-center space-x-1.5 rounded-lg border border-[#262626] bg-[#141414] hover:bg-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] transition-colors shadow-sm"
              >
                <AiCoreIcon className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.5} />
                <span>
                  {isAiReportLoading ? 'AI hisoboti tayyorlanmoqda...' : 'AI Xavfsizlik Hisoboti'}
                </span>
              </button>

              <button
                type="button"
                onClick={refreshReports}
                className="flex items-center space-x-1.5 rounded-lg border border-[#1F1F1F] bg-[#141414] px-3 py-1.5 text-xs text-[#FAFAFA] hover:bg-[#1E1E1E] transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isReportsLoading ? 'animate-spin' : ''}`} />
                <span>Radarni yangilash</span>
              </button>
            </div>
          </div>

          {/* AI Executive Briefing Card */}
          {aiReport && (
            <div className="rounded-xl border border-[#222222] bg-[#0D0D0D] p-5 space-y-3.5 shadow-xl animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A1A1A]">
                <div className="flex items-center space-x-2">
                  <AiCoreIcon className="h-4 w-4 text-[#10B981]" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-[#FAFAFA] tracking-tight">
                    AI Boshqaruv va Kontrafakt Xavfi Tahlili
                  </h3>
                </div>

                <span
                  className={`inline-flex items-center space-x-1 rounded px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                    aiReport.risk_level === 'Past'
                      ? 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]'
                      : aiReport.risk_level === 'Yuqori'
                      ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                      : 'bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]'
                  }`}
                >
                  <span>Xavf darajasi: {aiReport.risk_level}</span>
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1">
                    Boshqaruv Xulosasi
                  </span>
                  <p className="text-[#888888] leading-relaxed">
                    {aiReport.executive_summary}
                  </p>
                </div>

                {aiReport.risky_serial_codes && aiReport.risky_serial_codes.length > 0 && (
                  <div className="pt-2 border-t border-[#141414]">
                    <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1.5">
                      Shubhali Seriya Kodlari
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiReport.risky_serial_codes.map((code, idx) => (
                        <span
                          key={idx}
                          className="rounded border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#F59E0B]"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {aiReport.top_hotspots && aiReport.top_hotspots.length > 0 && (
                  <div className="pt-2 border-t border-[#141414]">
                    <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1.5">
                      Aniqlangan Hududlar va Bozorlar
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {aiReport.top_hotspots.map((spot, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-[#141414] border border-[#262626] px-2.5 py-1 text-[11px] font-medium text-[#FAFAFA] flex items-center space-x-1"
                        >
                          <MapPin className="h-3 w-3 text-[#EF4444]" strokeWidth={1.75} />
                          <span>{spot}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-[#141414]">
                  <span className="text-[10px] text-[#525252] uppercase font-mono tracking-wider block mb-1">
                    Tavsiya Etilgan B2B Himoya Choralari
                  </span>
                  <p className="text-[#FAFAFA] font-medium leading-relaxed">
                    {aiReport.action_recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {reports.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-[#1F1F1F] bg-[#0A0A0A]">
              <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" strokeWidth={1.75} />
              <div className="text-sm font-semibold text-[#FAFAFA]">
                Hozircha shikoyatlar kelib tushmagan
              </div>
              <p className="text-xs text-[#888888] mt-1">
                {currentManufacturer.name} mahsulotlari toza va kontrafakt signallarisiz aylanmoqda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-[#EF4444]/30 bg-[#0A0A0A] p-5 shadow-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#EF4444]">
                          {r.product?.serial_code || 'NOMAʼLUM KOD'}
                        </span>
                        <span className="text-xs font-semibold text-[#FAFAFA]">
                          {r.product?.product_name || 'Ro‘yxatdan o‘tmagan mahsulot'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#525252] font-mono flex items-center space-x-1">
                      <Clock className="h-3 w-3" strokeWidth={1.75} />
                      <span>
                        {new Date(r.scanned_at).toLocaleString('uz-UZ', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-[#888888] flex flex-wrap items-center gap-y-1 gap-x-3 pt-1 border-t border-[#141414]">
                    <div className="flex items-center space-x-1 text-[#FAFAFA]">
                      <MapPin className="h-3.5 w-3.5 text-[#EF4444]" strokeWidth={1.75} />
                      <span className="font-medium">{r.location_note || 'Manzil nomaʼlum'}</span>
                    </div>
                    {r.device_info && (
                      <div className="flex items-center space-x-1 text-[#525252]">
                        <Smartphone className="h-3 w-3" strokeWidth={1.75} />
                        <span>{r.device_info}</span>
                      </div>
                    )}
                  </div>

                  {r.report_message && (
                    <div className="rounded-lg bg-[#050505] border border-[#141414] p-3 text-xs text-[#FAFAFA] leading-relaxed">
                      &quot;{r.report_message}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Single QR Label Modal */}
      <QrLabelCard
        product={selectedProductForQr}
        isOpen={Boolean(selectedProductForQr)}
        onClose={() => setSelectedProductForQr(null)}
      />

      {/* Batch A4 QR Modal */}
      <BatchQrModal
        products={batchCreatedProducts}
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setBatchCreatedProducts([]);
        }}
      />
    </div>
  );
};
