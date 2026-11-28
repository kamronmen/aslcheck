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
  Copy,
  Printer,
} from 'lucide-react';
import type {
  Manufacturer,
  ProductWithManufacturer,
  ReportWithProduct,
  ScanTrendPoint,
} from '../types';
import {
  restoreProducerSession,
  logoutProducerAccount,
  fetchProducerProducts,
  deleteProduct,
  fetchReports,
  fetchScanTrend,
} from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateProducerAiReport, type ProducerAiReport } from '../lib/ai';
import type { BulkDraftItem } from '../lib/csvImport';
import { ProducerAuth } from './ProducerAuth';
import { ProducerQuickAddPanel } from './ProducerQuickAddPanel';
import { QrLabelCard } from './QrLabelCard';
import { BatchQrModal } from './BatchQrModal';
import { AudioPlayerButton } from './AudioPlayerButton';
import { ScanAnalyticsChart } from './ScanAnalyticsChart';
import { UzbekistanGeoRadar } from './UzbekistanGeoRadar';
import {
  AiCoreIcon,
  VerifiedSealIcon,
  CloneAlertIcon,
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

  // Modals & Quick-Add Prefill
  const [selectedProductForQr, setSelectedProductForQr] = useState<ProductWithManufacturer | null>(null);
  const [batchCreatedProducts, setBatchCreatedProducts] = useState<ProductWithManufacturer[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [prefillDraft, setPrefillDraft] = useState<BulkDraftItem | null>(null);
  const [panelInstanceKey, setPanelInstanceKey] = useState(0);

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
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentManufacturer(null);
          setIsDemoMode(false);
          setProducts([]);
          setReports([]);
          setScanTrend([]);
          setAiReport(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          const restored = await restoreProducerSession();
          if (active && restored) {
            setCurrentManufacturer(restored.manufacturer);
            setIsDemoMode(restored.isDemo);
          }
          // Clean auth fragments/params from URL after email confirmation redirect
          if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
            window.history.replaceState({}, '', `${window.location.origin}/?tab=producer`);
          }
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
    if (!currentManufacturer) return;
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
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
        products_summary: products.map((p) => ({
          serial_code: p.serial_code,
          product_name: p.product_name,
          category: p.category,
          scan_count: p.scan_count,
          max_safe_scans: p.max_safe_scans,
          is_flagged: p.is_flagged,
          is_claimed: p.is_claimed,
        })),
        reports: reports.map((r) => ({
          serial_code: r.product?.serial_code,
          product_name: r.product?.product_name,
          scanned_at: r.scanned_at,
          location_note: r.location_note,
          report_message: r.report_message,
        })),
      });
      setAiReport(report);
    } catch (err) {
      console.error('Failed to generate producer AI report:', err);
    } finally {
      setIsAiReportLoading(false);
    }
  };

  // Handle products created from ProducerQuickAddPanel (single, batch, or multi-SKU import)
  const handleProductsCreated = (createdItems: ProductWithManufacturer[]) => {
    if (createdItems.length === 1) {
      setSelectedProductForQr(createdItems[0]);
    } else if (createdItems.length > 1) {
      setBatchCreatedProducts(createdItems);
      setIsBatchModalOpen(true);
    }
    setShowAddForm(false);
    loadData();
  };

  // Duplicate existing product into quick-add panel
  const handleDuplicateProduct = (product: ProductWithManufacturer) => {
    setPrefillDraft({
      id: `copy-${product.id}`,
      product_name: product.product_name,
      category: product.category,
      batch_number: `${product.batch_number}-2`,
      quantity: 5,
      max_safe_scans: product.max_safe_scans || 3,
      manufacture_date: new Date().toISOString().split('T')[0],
      expiry_date:
        product.expiry_date ||
        new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
      ingredients: product.ingredients || '',
    });
    setPanelInstanceKey((k) => k + 1);
    setShowAddForm(true);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" mahsulotini o‘chirishni tasdiqlaysizmi?`)) return;
    try {
      const ok = await deleteProduct(id, currentManufacturer?.id);
      if (ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await logoutProducerAccount();
    setCurrentManufacturer(null);
    setAiReport(null);
    setIsDemoMode(false);
  };

  // If still checking active session
  if (isCheckingSession) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-[#888888]" />
        <span className="text-xs text-[#888888]">
          Ishlab chiqaruvchi sessiyasi tekshirilmoqda...
        </span>
      </div>
    );
  }

  // If not logged in, render executive Auth card
  if (!currentManufacturer) {
    return (
      <ProducerAuth
        onAuthenticated={(manufacturer, demo) => {
          setAiReport(null);
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

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
      {/* Multi-Tenant Producer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#18181B]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white break-words">
              {currentManufacturer.name}
            </h1>
            {currentManufacturer.verified && (
              <span className="inline-flex items-center space-x-1 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-medium text-[#10B981]">
                <VerifiedSealIcon className="h-3 w-3" strokeWidth={1.75} />
                <span>Tasdiqlangan</span>
              </span>
            )}
            {isDemoMode && (
              <span className="rounded-md border border-[#1F1F23] bg-[#0A0A0C] px-2 py-0.5 text-[10px] font-mono text-[#71717A]">
                DEMO REJIM
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#71717A]">
            <span className="inline-flex items-center space-x-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#52525B]" strokeWidth={1.75} />
              <span>{currentManufacturer.region}</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 font-mono text-[11px] break-all">
              <span className="text-[#52525B]">Litsenziya:</span>
              <span className="text-zinc-200">{currentManufacturer.license_number}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (!showAddForm) {
                setPrefillDraft(null);
                setPanelInstanceKey((k) => k + 1);
              }
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center justify-center space-x-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-[#F4F4F5] transition-all shadow-[0_0_25px_rgba(255,255,255,0.16)] min-h-[40px]"
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
            className="flex items-center space-x-1.5 rounded-xl border border-[#1F1F23] bg-[#0A0A0C] px-3.5 py-2.5 text-xs font-medium text-[#71717A] hover:text-white hover:border-[#27272A] transition-colors min-h-[40px]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Chiqish</span>
          </button>
        </div>
      </div>

      {/* Top KPI Row: Pure Black #0A0A0C with 1px #1F1F23 */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="rounded-2xl border border-[#1F1F23] border-t-white/[0.08] bg-[#0A0A0C] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between text-[#71717A]">
            <span className="text-xs font-medium">Jami mahsulotlar</span>
            <Package className="h-4 w-4 text-zinc-300" strokeWidth={1.75} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono text-white tabular-nums">
              {totalProducts}
            </span>
            <span className="text-xs text-[#71717A]">ta ro‘yxatda</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1F1F23] border-t-white/[0.08] bg-[#0A0A0C] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between text-[#71717A]">
            <span className="text-xs font-medium">Jami tekshiruvlar</span>
            <Layers className="h-4 w-4 text-zinc-300" strokeWidth={1.75} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono text-white tabular-nums">
              {totalScans}
            </span>
            <span className="text-xs text-[#71717A]">marta skanerlandi</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1F1F23] border-t-white/[0.08] bg-[#0A0A0C] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between text-[#71717A]">
            <span className="text-xs font-medium">Shubhali / Shikoyatlar</span>
            <CloneAlertIcon
              className={`h-4 w-4 ${suspiciousCount > 0 ? 'text-[#F59E0B]' : 'text-zinc-400'}`}
              strokeWidth={1.5}
            />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span
              className={`text-2xl sm:text-3xl font-semibold tracking-tight font-mono tabular-nums ${
                suspiciousCount > 0 ? 'text-[#F59E0B]' : 'text-white'
              }`}
            >
              {suspiciousCount}
            </span>
            <span className="text-xs text-[#71717A]">ta ogohlantirish</span>
          </div>
        </div>
      </div>

      {/* 7-Day Smooth SVG Area Spline Chart */}
      <div className="mt-5">
        <ScanAnalyticsChart data={scanTrend} />
      </div>

      {/* Collapsible Fast Add Panel (AI Smart Fill, Batch, & Excel/CSV Import) */}
      {showAddForm && (
        <ProducerQuickAddPanel
          key={panelInstanceKey}
          manufacturer={currentManufacturer}
          initialDraft={prefillDraft}
          onClose={() => {
            setShowAddForm(false);
            setPrefillDraft(null);
          }}
          onCreated={handleProductsCreated}
        />
      )}

      {/* Sub-Tab Navigation: Products vs Reports Radar */}
      <div className="mt-8 flex border-b border-[#18181B]">
        <button
          type="button"
          onClick={() => setActiveSection('products')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === 'products'
              ? 'border-white text-white'
              : 'border-transparent text-[#71717A] hover:text-white'
          }`}
        >
          <Package className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Mahsulotlar Ro‘yxati</span>
          <span className="rounded bg-[#0A0A0C] border border-[#1F1F23] px-1.5 py-0.5 text-[10px] font-mono text-[#71717A]">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('reports')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === 'reports'
              ? 'border-[#EF4444] text-[#EF4444]'
              : 'border-transparent text-[#71717A] hover:text-white'
          }`}
        >
          <ShieldRadarIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Kelib tushgan shikoyatlar</span>
          {reports.length > 0 && (
            <span className="rounded bg-[#EF4444]/15 border border-[#EF4444]/30 px-1.5 py-0.2 text-[10px] font-mono font-bold text-[#EF4444]">
              {reports.length} ta
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: PRODUCTS (MOBILE CARD LIST + DESKTOP TABLE) */}
      {activeSection === 'products' && (
        <div className="mt-5 rounded-2xl border border-[#1F1F23] border-t-white/[0.08] bg-[#0A0A0C] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border-b border-[#18181B] gap-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold tracking-tight">
                <span className="text-white">Ro‘yxatga olingan</span>{' '}
                <span className="text-[#71717A]">mahsulotlar</span>
              </h2>
              <span className="rounded-md bg-black border border-[#1F1F23] px-2 py-0.5 text-[11px] font-mono text-[#71717A]">
                {filteredProducts.length} ta
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-[#52525B]" />
                <input
                  type="text"
                  placeholder="Qidirish (seriya, nom, partiya)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-[#1F1F23] bg-black py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-[#52525B] focus:border-white/40 focus:outline-none"
                />
              </div>
              {filteredProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchCreatedProducts(filteredProducts.slice(0, 100));
                    setIsBatchModalOpen(true);
                  }}
                  title="Ro‘yxatdagi mahsulotlar uchun A4 QR varaq ochish"
                  className="inline-flex items-center space-x-1.5 rounded-xl border border-[#27272A] bg-black px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors shrink-0"
                >
                  <Printer className="h-3.5 w-3.5 text-zinc-300" strokeWidth={1.75} />
                  <span className="hidden sm:inline">A4 QR</span>
                </button>
              )}
              <button
                type="button"
                onClick={loadData}
                title="Yangilash"
                className="p-2.5 rounded-xl border border-[#1F1F23] bg-black text-[#71717A] hover:text-white hover:border-[#27272A] transition-colors shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 1. Mobile Card List (md:hidden) — Ergonomic Touch Cards */}
          <div className="md:hidden p-3 space-y-3">
            {isLoading && products.length === 0 ? (
              <div className="py-8 text-center text-[#71717A] space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-zinc-400" />
                <p className="text-xs">Mahsulotlar yuklanmoqda...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-8 text-center text-[#71717A] text-xs">
                Ushbu korxona hisobida hozircha mahsulotlar mavjud emas. Yangi mahsulot qo‘shing.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSuspicious =
                  p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3);

                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[#1F1F23] bg-[#050507] p-3.5 space-y-2.5"
                  >
                    {/* Top Row: Name + Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs sm:text-sm text-white break-words">
                        {p.product_name}
                      </div>
                      <div className="shrink-0">
                        {isSuspicious ? (
                          <span className="inline-flex items-center space-x-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                            <CloneAlertIcon className="h-3 w-3" strokeWidth={1.5} />
                            <span>Shubhali</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                            <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                            <span>Faol</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Serial Code + Meta */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-black border border-[#1F1F23] px-2 py-0.5 font-mono text-xs font-semibold text-white break-all">
                        {p.serial_code}
                      </span>
                      <span className="text-[11px] text-[#71717A] font-mono">
                        {p.batch_number}
                      </span>
                      <span className="text-[11px] text-[#52525B]">
                        • {p.category}
                      </span>
                    </div>

                    {/* Bottom Row: Scans & Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#18181B]">
                      <div className="text-xs font-mono">
                        <span className="text-[#71717A]">Skaner: </span>
                        <span
                          className={
                            isSuspicious
                              ? 'text-[#F59E0B] font-bold'
                              : 'text-[#10B981] font-semibold'
                          }
                        >
                          {p.scan_count || 0}
                        </span>
                        <span className="text-[#52525B]"> / {p.max_safe_scans || 3}</span>
                        {p.is_claimed && (
                          <span className="ml-2 text-[10px] text-[#60A5FA] bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-1.5 py-0.2 rounded font-sans">
                            Band
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(p)}
                          title="Ushbu mahsulotdan nusxa olib tez qo‘shish"
                          className="inline-flex items-center space-x-1 rounded-lg border border-[#1F1F23] bg-black px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:text-white hover:border-[#27272A] transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                          <span>Nusxa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedProductForQr(p)}
                          className="inline-flex items-center space-x-1.5 rounded-lg border border-[#27272A] bg-[#0A0A0C] px-3 py-1.5 text-xs font-semibold text-white hover:border-zinc-500 transition-colors"
                        >
                          <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
                          <span>QR-kod</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id, p.product_name)}
                          title="Mahsulotni o‘chirish"
                          className="p-1.5 rounded-lg text-[#52525B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Desktop Table (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#18181B] bg-[#050507] text-[#71717A] font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Seriya Kodi</th>
                  <th className="px-4 py-3">Mahsulot Nomi</th>
                  <th className="px-4 py-3">Kategoriya</th>
                  <th className="px-4 py-3">Partiya</th>
                  <th className="px-4 py-3">Skaner</th>
                  <th className="px-4 py-3">Bandligi</th>
                  <th className="px-4 py-3">Holati</th>
                  <th className="px-4 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181B] text-white">
                {isLoading && products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[#71717A]">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                      <span>Mahsulotlar yuklanmoqda...</span>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[#71717A]">
                      Ushbu korxona hisobida hozircha mahsulotlar mavjud emas. Yangi mahsulot qo‘shing.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isSuspicious =
                      p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3);

                    return (
                      <tr key={p.id} className="hover:bg-[#111114] transition-colors">
                        <td className="px-4 py-3.5 font-mono font-semibold text-white">
                          <span className="rounded-md bg-black border border-[#1F1F23] px-2 py-0.5 break-all">
                            {p.serial_code}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-medium">
                          <div className="break-words">{p.product_name}</div>
                        </td>

                        <td className="px-4 py-3.5 text-[#71717A]">
                          {p.category}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[#71717A]">
                          {p.batch_number}
                        </td>

                        <td className="px-4 py-3.5 font-mono tabular-nums">
                          <span
                            className={
                              isSuspicious
                                ? 'text-[#F59E0B] font-bold'
                                : 'text-[#10B981]'
                            }
                          >
                            {p.scan_count || 0}
                          </span>
                          <span className="text-[#52525B]">
                            {' '}
                            / {p.max_safe_scans || 3}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {p.is_claimed ? (
                            <span className="inline-flex items-center space-x-1 rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#60A5FA]">
                              <span>Band qilingan</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#71717A]">Erkin</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {isSuspicious ? (
                            <span className="inline-flex items-center space-x-1 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                              <CloneAlertIcon className="h-3 w-3" strokeWidth={1.5} />
                              <span>Shubhali</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                              <span>Faol</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleDuplicateProduct(p)}
                              title="Nusxa olish"
                              className="inline-flex items-center space-x-1 rounded-lg border border-[#1F1F23] bg-black px-2 py-1 text-xs text-[#71717A] hover:text-white hover:border-[#27272A] transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                              <span>Nusxa</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedProductForQr(p)}
                              className="inline-flex items-center space-x-1.5 rounded-lg border border-[#27272A] bg-[#0A0A0C] px-2.5 py-1 text-xs font-medium text-white hover:border-zinc-500 transition-colors"
                            >
                              <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
                              <span>QR-kod</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.product_name)}
                              title="Mahsulotni o‘chirish"
                              className="p-1 rounded-lg text-[#52525B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
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
        <div className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 rounded-2xl border border-[#1F1F23] border-t-white/[0.08] bg-[#0A0A0C] gap-3 shadow-lg">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white flex items-center space-x-2">
                <ShieldRadarIcon className="h-4 w-4 text-[#EF4444]" strokeWidth={1.5} />
                <span>Jonli Shikoyatlar va Soxtalik Signallari</span>
              </h2>
              <p className="text-xs text-[#71717A] mt-0.5">
                Faqat {currentManufacturer.name} mahsulotlari bo‘yicha kelib tushgan real vaqt signallari
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunProducerAiReport}
                disabled={isAiReportLoading}
                className="flex items-center space-x-1.5 rounded-xl border border-[#27272A] bg-black hover:border-zinc-500 px-3.5 py-2 text-xs font-medium text-white transition-colors min-h-[38px]"
              >
                <AiCoreIcon className="h-3.5 w-3.5 text-indigo-400" strokeWidth={1.75} />
                <span>
                  {isAiReportLoading ? 'AI hisoboti tayyorlanmoqda...' : 'AI Xavfsizlik Hisoboti'}
                </span>
              </button>

              <button
                type="button"
                onClick={refreshReports}
                className="flex items-center space-x-1.5 rounded-xl border border-[#1F1F23] bg-black px-3.5 py-2 text-xs text-white hover:border-[#27272A] transition-colors min-h-[38px]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isReportsLoading ? 'animate-spin' : ''}`} />
                <span>Radarni yangilash</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Uzbekistan Counterfeit & Hotspot Radar Map */}
          <UzbekistanGeoRadar
            mode="hotspots"
            reports={reports}
            homeRegion={currentManufacturer.region}
          />

          {/* AI Executive Briefing Card */}
          {aiReport && (
            <div className="relative overflow-hidden rounded-2xl border border-[#1F1F23] bg-[#0A0A0C] p-4 sm:p-5 space-y-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.85)] animate-in fade-in duration-300">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-[#18181B]">
                <div className="flex items-center space-x-2">
                  <AiCoreIcon className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
                  <h3 className="text-xs font-semibold text-white tracking-tight">
                    AI Boshqaruv va Kontrafakt Xavfi Tahlili
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center space-x-1 rounded-md px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                      aiReport.risk_level === 'Past'
                        ? 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]'
                        : aiReport.risk_level === 'Yuqori'
                        ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                        : 'bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]'
                    }`}
                  >
                    <span>Xavf darajasi: {aiReport.risk_level}</span>
                  </span>

                  {/* Audio player for producer executive report */}
                  <AudioPlayerButton
                    text={`${aiReport.executive_summary}. Tavsiya etilgan choralar: ${aiReport.action_recommendation}`}
                    id={`producer-ai-report-${currentManufacturer.id}`}
                    label="AI hisobotini tinglash"
                    variant="pill"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1">
                    Boshqaruv Xulosasi
                  </span>
                  <p className="text-[#A1A1AA] leading-relaxed break-words">
                    {aiReport.executive_summary}
                  </p>
                </div>

                {aiReport.risky_serial_codes && aiReport.risky_serial_codes.length > 0 && (
                  <div className="pt-2 border-t border-[#18181B]">
                    <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1.5">
                      Shubhali Seriya Kodlari
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiReport.risky_serial_codes.map((code, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#F59E0B] break-all"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {aiReport.top_hotspots && aiReport.top_hotspots.length > 0 && (
                  <div className="pt-2 border-t border-[#18181B]">
                    <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1.5">
                      Aniqlangan Hududlar va Bozorlar
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {aiReport.top_hotspots.map((spot, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-black border border-[#1F1F23] px-2.5 py-1 text-[11px] font-medium text-white flex items-center space-x-1"
                        >
                          <MapPin className="h-3 w-3 text-[#EF4444]" strokeWidth={1.75} />
                          <span>{spot}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-[#18181B]">
                  <span className="text-[10px] text-[#71717A] uppercase font-mono tracking-wider block mb-1">
                    Tavsiya Etilgan B2B Himoya Choralari
                  </span>
                  <p className="text-white font-medium leading-relaxed break-words">
                    {aiReport.action_recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {reports.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-2xl border border-[#1F1F23] bg-[#0A0A0C]">
              <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" strokeWidth={1.75} />
              <div className="text-sm font-semibold text-white">
                Hozircha shikoyatlar kelib tushmagan
              </div>
              <p className="text-xs text-[#71717A] mt-1">
                {currentManufacturer.name} mahsulotlari toza va kontrafakt signallarisiz aylanmoqda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-[#1F1F23] border-l-2 border-l-[#EF4444] bg-[#0A0A0C] p-4 sm:p-5 shadow-[0_14px_36px_rgba(0,0,0,0.7)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#EF4444] break-all">
                          {r.product?.serial_code || 'NOMAʼLUM KOD'}
                        </span>
                        <span className="text-xs font-semibold text-white break-words">
                          {r.product?.product_name || 'Ro‘yxatdan o‘tmagan mahsulot'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#71717A] font-mono flex items-center space-x-1 shrink-0">
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

                  <div className="text-xs text-[#A1A1AA] flex flex-wrap items-center gap-y-1 gap-x-3 pt-2 border-t border-[#18181B]">
                    <div className="flex items-center space-x-1 text-white">
                      <MapPin className="h-3.5 w-3.5 text-[#EF4444]" strokeWidth={1.75} />
                      <span className="font-medium break-words">{r.location_note || 'Manzil nomaʼlum'}</span>
                    </div>
                    {r.device_info && (
                      <div className="flex items-center space-x-1 text-[#71717A]">
                        <Smartphone className="h-3 w-3" strokeWidth={1.75} />
                        <span>{r.device_info}</span>
                      </div>
                    )}
                  </div>

                  {r.report_message && (
                    <div className="rounded-xl bg-[#050507] border border-[#18181B] p-3 text-xs text-zinc-200 leading-relaxed break-words">
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
