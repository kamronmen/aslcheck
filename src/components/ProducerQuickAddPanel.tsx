import React, { useState, useRef } from 'react';
import {
  Plus,
  RefreshCw,
  ImagePlus,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  X,
  ClipboardList,
} from 'lucide-react';
import type { Manufacturer, NewProductPayload, ProductWithManufacturer } from '../types';
import { createBatchProducts, createMultiSkuProducts } from '../lib/api';
import { extractProductsWithAi } from '../lib/ai';
import { compressImageForVision } from '../lib/qr';
import {
  parseDelimitedProducts,
  downloadCsvTemplate,
  SAMPLE_TSV_TEXT,
  type BulkDraftItem,
} from '../lib/csvImport';
import { AiCoreIcon, BatchGridIcon } from './Icons';

interface ProducerQuickAddPanelProps {
  manufacturer: Manufacturer;
  initialDraft: BulkDraftItem | null;
  onClose: () => void;
  onCreated: (createdItems: ProductWithManufacturer[]) => void;
}

const CATEGORIES = [
  'Oziq-ovqat',
  'Salomatlik',
  'Ichimlik',
  'Kosmetika',
  'Hunarmandchilik',
  'Boshqa',
];

const QUICK_QUANTITIES = [1, 5, 10, 25, 50, 100];

const AI_QUICK_EXAMPLES = [
  "Tabiiy Tog' Asali (1 kg), Partiya B-18, muddati 2 yil, tarkibi tog' gullari nektari, 10 ta",
  "Qora Sedana Yog'i (250ml), Salomatlik, Partiya S-09, muddati 1 yil, 25 ta",
];

function generateRandomSerial(): string {
  return `ASL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
}

function addMonthsIso(baseIso: string, months: number): string {
  const base = baseIso ? new Date(baseIso) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().split('T')[0];
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export const ProducerQuickAddPanel: React.FC<ProducerQuickAddPanelProps> = ({
  manufacturer,
  initialDraft,
  onClose,
  onCreated,
}) => {
  const [activeMode, setActiveMode] = useState<'quick' | 'bulk'>('quick');

  // Single / Batch Quick Form State
  const [formName, setFormName] = useState(() => initialDraft?.product_name || '');
  const [formCategory, setFormCategory] = useState(() => initialDraft?.category || 'Oziq-ovqat');
  const [formBatch, setFormBatch] = useState(() => initialDraft?.batch_number || 'BATCH-2026-N1');
  const [formManufactureDate, setFormManufactureDate] = useState(
    () => initialDraft?.manufacture_date || new Date().toISOString().split('T')[0]
  );
  const [formExpiryDate, setFormExpiryDate] = useState(
    () => initialDraft?.expiry_date || new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0]
  );
  const [formIngredients, setFormIngredients] = useState(() => initialDraft?.ingredients || '');
  const [formMaxSafeScans, setFormMaxSafeScans] = useState(() => initialDraft?.max_safe_scans || 3);
  const [formQuantity, setFormQuantity] = useState(() => initialDraft?.quantity || 1);
  const [formSerialCode, setFormSerialCode] = useState(generateRandomSerial);

  // AI Smart Fill State
  const [aiPromptText, setAiPromptText] = useState('');
  const [isAiFilling, setIsAiFilling] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState<string | null>(() =>
    initialDraft
      ? `"${initialDraft.product_name}" nusxalandi — partiya yoki miqdorni tahrirlab saqlang.`
      : null
  );
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Bulk Excel / CSV State
  const [bulkText, setBulkText] = useState('');
  const [bulkItems, setBulkItems] = useState<BulkDraftItem[]>([]);
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([]);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const applySingleDraftToForm = (item: Omit<BulkDraftItem, 'id'>) => {
    setFormName(item.product_name);
    setFormCategory(CATEGORIES.includes(item.category) ? item.category : 'Boshqa');
    setFormBatch(item.batch_number);
    setFormQuantity(Math.max(1, Math.min(100, item.quantity || 1)));
    setFormMaxSafeScans(Math.max(1, Math.min(20, item.max_safe_scans || 3)));
    setFormManufactureDate(item.manufacture_date);
    setFormExpiryDate(item.expiry_date);
    setFormIngredients(item.ingredients || '');
    setFormSerialCode(generateRandomSerial());
  };

  const handleRunAiSmartFill = async (overrideText?: string, imageFile?: File) => {
    const prompt = (overrideText ?? aiPromptText).trim();
    if (!prompt && !imageFile) return;

    setIsAiFilling(true);
    setAiStatusMsg(null);
    try {
      let imagePayload: { base64: string; mimeType: string } | null = null;
      if (imageFile) {
        const compressed = await compressImageForVision(imageFile, 1024, 0.8);
        imagePayload = { base64: compressed.base64, mimeType: compressed.mimeType };
      }

      const items = await extractProductsWithAi({
        promptText: prompt,
        imageBase64: imagePayload?.base64,
        mimeType: imagePayload?.mimeType,
      });

      if (items.length === 1) {
        applySingleDraftToForm(items[0]);
        setAiStatusMsg('AI barcha maydonlarni avtomatik to‘ldirdi. Tekshirib saqlang!');
      } else if (items.length > 1) {
        const drafts: BulkDraftItem[] = items.map((item, idx) => ({
          ...item,
          id: `ai-bulk-${Date.now()}-${idx}`,
        }));
        setBulkItems(drafts);
        setActiveMode('bulk');
        setAiStatusMsg(`${drafts.length} ta turli mahsulot ajratildi va Ommaviy Import jadvaliga o‘tkazildi.`);
      } else {
        setAiStatusMsg('Ma’lumotlarni ajratib bo‘lmadi. Qisqa nom va muddatni aniqroq yozing.');
      }
    } catch (err) {
      console.error('AI smart fill failed:', err);
      setAiStatusMsg('AI tahlilida xatolik yuz berdi. Qo‘lda to‘ldiring.');
    } finally {
      setIsAiFilling(false);
    }
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void handleRunAiSmartFill(aiPromptText, file);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const basePayload: NewProductPayload = {
        serial_code: formSerialCode.trim().toUpperCase(),
        product_name: formName.trim(),
        category: formCategory,
        batch_number: formBatch.trim(),
        manufacture_date: formManufactureDate,
        expiry_date: formExpiryDate,
        ingredients: formIngredients.trim() || null,
        max_safe_scans: Number(formMaxSafeScans) || 3,
        manufacturer_id: manufacturer.id,
      };

      const qty = Math.max(1, Math.min(100, Number(formQuantity) || 1));
      const createdItems = await createBatchProducts(basePayload, qty, manufacturer);
      if (createdItems.length > 0) {
        setFormName('');
        setFormIngredients('');
        setFormQuantity(1);
        setFormSerialCode(generateRandomSerial());
        setAiPromptText('');
        setAiStatusMsg(null);
        onCreated(createdItems);
      }
    } catch (err) {
      console.error('Failed to add products:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Import Handlers
  const parseAndSetBulkText = (text: string) => {
    setBulkText(text);
    const { items, warnings } = parseDelimitedProducts(text);
    setBulkItems(items);
    setBulkWarnings(warnings);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      parseAndSetBulkText(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleUpdateBulkQty = (id: string, nextQty: number) => {
    const clamped = Math.max(1, Math.min(100, nextQty || 1));
    setBulkItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: clamped } : item)));
  };

  const handleRemoveBulkRow = (id: string) => {
    setBulkItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalBulkQrCount = bulkItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleSaveBulkItems = async () => {
    if (bulkItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const entries = bulkItems.map((item) => ({
        quantity: item.quantity,
        payload: {
          serial_code: item.serial_code || '',
          product_name: item.product_name,
          category: item.category,
          batch_number: item.batch_number,
          manufacture_date: item.manufacture_date,
          expiry_date: item.expiry_date,
          ingredients: item.ingredients || null,
          max_safe_scans: item.max_safe_scans || 3,
          manufacturer_id: manufacturer.id,
        } satisfies NewProductPayload,
      }));

      const createdItems = await createMultiSkuProducts(entries, manufacturer);
      if (createdItems.length > 0) {
        setBulkText('');
        setBulkItems([]);
        setBulkWarnings([]);
        onCreated(createdItems);
      }
    } catch (err) {
      console.error('Bulk import failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-white/[0.08] border-t-white/15 bg-gradient-to-b from-[#121212] to-[#080808] p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in fade-in duration-200">
      {/* Panel Header + Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#1F1F1F]">
        <div className="flex items-center space-x-2">
          <BatchGridIcon className="h-4 w-4 text-[#FAFAFA] shrink-0" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#FAFAFA]">
            Tez Mahsulot Qo‘shish (AI / Partiya / Excel)
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="inline-flex rounded-lg border border-[#1F1F1F] bg-[#000000] p-0.5">
            <button
              type="button"
              onClick={() => setActiveMode('quick')}
              className={`inline-flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px] ${
                activeMode === 'quick'
                  ? 'bg-white text-black font-semibold'
                  : 'text-[#888888] hover:text-[#FAFAFA]'
              }`}
            >
              <AiCoreIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Tez Forma + AI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('bulk')}
              className={`inline-flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px] ${
                activeMode === 'bulk'
                  ? 'bg-white text-black font-semibold'
                  : 'text-[#888888] hover:text-[#FAFAFA]'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Excel / CSV ({bulkItems.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Oynani yopish"
            className="rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] p-1.5 text-[#888888] hover:text-[#FAFAFA] min-h-[34px] min-w-[34px] flex items-center justify-center"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Status Toast */}
      {aiStatusMsg && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-xs text-[#A7F3D0]">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" strokeWidth={2} />
            <span>{aiStatusMsg}</span>
          </span>
          <button
            type="button"
            onClick={() => setAiStatusMsg(null)}
            className="text-[#888888] hover:text-white p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* TAB 1: QUICK FORM + AI SMART FILL */}
      {activeMode === 'quick' && (
        <div className="mt-4 space-y-5">
          {/* AI Smart Fill Strip */}
          <div className="rounded-xl border border-white/[0.08] bg-[#050505] p-3.5 sm:p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#FAFAFA]">
                <AiCoreIcon className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.75} />
                <span>AI Aqlli To‘ldirish — 1 gap yozing yoki qadoq rasmini yuklang</span>
              </div>
              <span className="text-[10px] font-mono text-[#666666]">
                1 yoki bir nechta mahsulotni ajratadi
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleRunAiSmartFill();
                  }
                }}
                placeholder="Masalan: Tog' asali 500g, Partiya B-12, muddati 2 yil, tarkibi gul nektari, 20 ta"
                disabled={isAiFilling}
                className="flex-1 rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 text-base sm:text-sm text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
              />

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelected}
                className="hidden"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isAiFilling}
                  title="Qadoq yorlig‘i suratidan AI orqali to‘ldirish"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 rounded-lg border border-[#262626] bg-[#111111] px-3 py-2 text-xs font-medium text-[#FAFAFA] hover:bg-[#1A1A1A] disabled:opacity-40 transition-colors min-h-[42px]"
                >
                  <ImagePlus className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.75} />
                  <span>Qadoq rasmi</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleRunAiSmartFill()}
                  disabled={isAiFilling || !aiPromptText.trim()}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] px-3.5 py-2 text-xs font-semibold text-[#FAFAFA] hover:bg-[#242424] disabled:opacity-40 transition-colors min-h-[42px]"
                >
                  {isAiFilling ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Tahlil...</span>
                    </>
                  ) : (
                    <>
                      <AiCoreIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>AI To‘ldirsin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-mono text-[#525252] mr-1">Namuna:</span>
              {AI_QUICK_EXAMPLES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isAiFilling}
                  onClick={() => {
                    setAiPromptText(example);
                    void handleRunAiSmartFill(example);
                  }}
                  className="rounded-md border border-[#1F1F1F] bg-[#0A0A0A] px-2 py-1 text-[10px] text-[#888888] hover:text-[#FAFAFA] hover:border-[#333333] transition-colors truncate max-w-full"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Structured Form with Quick Presets */}
          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 text-base sm:text-sm text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Kategoriya
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 text-base sm:text-sm text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#FAFAFA]">
                    Miqdori (unikal QR-kodlar) *
                  </label>
                  <span className="text-[10px] text-[#888888]">1 dan 100 gacha</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-[#262626] bg-[#000000] px-3.5 py-2.5 font-mono text-base sm:text-sm font-bold text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_QUANTITIES.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setFormQuantity(qty)}
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] border transition-colors ${
                        formQuantity === qty
                          ? 'border-white bg-white text-black font-bold'
                          : 'border-[#1F1F1F] bg-[#0A0A0A] text-[#888888] hover:text-white'
                      }`}
                    >
                      {qty} ta
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#888888]">
                    Boshlang‘ich Seriya Kodi
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormSerialCode(generateRandomSerial())}
                    className="inline-flex items-center space-x-1 text-[10px] text-[#888888] hover:text-white font-mono"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>Avto yaratish</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formSerialCode}
                  onChange={(e) => setFormSerialCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 font-mono text-base sm:text-sm text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Partiya raqami
                </label>
                <input
                  type="text"
                  value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 font-mono text-base sm:text-sm text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Maksimal xavfsiz skanerlar
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formMaxSafeScans}
                  onChange={(e) => setFormMaxSafeScans(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 font-mono text-base sm:text-sm text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Ishlab chiqarilgan sana
                </label>
                <input
                  type="date"
                  value={formManufactureDate}
                  onChange={(e) => setFormManufactureDate(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 font-mono text-base sm:text-sm text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#888888]">
                    Yaroqlilik muddati
                  </label>
                  <div className="flex items-center space-x-1">
                    {[
                      { label: '+6 oy', months: 6 },
                      { label: '+1 yil', months: 12 },
                      { label: '+2 yil', months: 24 },
                    ].map((preset) => (
                      <button
                        key={preset.months}
                        type="button"
                        onClick={() =>
                          setFormExpiryDate(addMonthsIso(formManufactureDate, preset.months))
                        }
                        className="rounded border border-[#1F1F1F] bg-[#0A0A0A] px-1.5 py-0.5 text-[10px] font-mono text-[#888888] hover:text-white hover:border-[#333333]"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 font-mono text-base sm:text-sm text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none min-h-[42px]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#888888] mb-1.5">
                  Tarkibi va xomashyosi
                </label>
                <textarea
                  rows={2}
                  placeholder="Masalan: 100% tabiiy tog' asal mumi, glyukozasiz, konservantlarsiz."
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2.5 text-base sm:text-sm text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-[#1F1F1F]">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#1F1F1F] bg-[#141414] px-4 py-2.5 text-xs font-medium text-[#888888] hover:text-[#FAFAFA] min-h-[42px]"
              >
                Bekor qilish
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !formName.trim()}
                className="flex items-center justify-center space-x-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-40 transition-colors shadow-sm min-h-[42px]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
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

      {/* TAB 2: EXCEL / CSV BULK IMPORT */}
      {activeMode === 'bulk' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1F1F1F] bg-[#050505] p-3">
            <p className="text-xs text-[#888888]">
              Excel yoki Google Sheets’dan qatorlarni nusxalab tashlang (<code className="text-[#FAFAFA]">Ctrl+V</code>) yoki <code className="text-[#FAFAFA]">.csv</code> fayl yuklang.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadCsvTemplate()}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-[#262626] bg-[#111111] px-2.5 py-1.5 text-[11px] font-medium text-[#FAFAFA] hover:bg-[#1B1B1B]"
              >
                <Download className="h-3.5 w-3.5 text-[#888888]" />
                <span>Namuna CSV</span>
              </button>

              <button
                type="button"
                onClick={() => parseAndSetBulkText(SAMPLE_TSV_TEXT)}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-[#262626] bg-[#111111] px-2.5 py-1.5 text-[11px] font-medium text-[#10B981] hover:bg-[#1B1B1B]"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Namuna jadvalni to‘ldirish</span>
              </button>

              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-white/20 bg-[#181818] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#222222]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Fayl yuklash (.csv)</span>
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={bulkText}
            onChange={(e) => parseAndSetBulkText(e.target.value)}
            placeholder={`Nomi\tKategoriya\tPartiya\tMiqdori\tMuddati\tTarkibi\nTabiiy Asal (1kg)\tOziq-ovqat\tBATCH-01\t10\t2028-10-15\t100% gul nektari`}
            className="w-full rounded-xl border border-[#1F1F1F] bg-[#000000] p-3.5 font-mono text-base sm:text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none"
          />

          {bulkWarnings.length > 0 && (
            <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2 text-[11px] text-[#FCD34D]">
              {bulkWarnings[0]}
            </div>
          )}

          {/* Parsed Preview Rows */}
          {bulkItems.length > 0 && (
            <div className="rounded-xl border border-[#1F1F1F] bg-[#050505] overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-[#1F1F1F] bg-[#0A0A0A]">
                <span className="text-xs font-semibold text-[#FAFAFA]">
                  Tayyor ro‘yxat: {bulkItems.length} xil mahsulot •{' '}
                  <span className="font-mono text-[#10B981]">
                    Jami {Math.min(100, totalBulkQrCount)} ta QR-kod
                  </span>
                </span>
                {totalBulkQrCount > 100 && (
                  <span className="text-[10px] font-mono text-[#F59E0B]">
                    Bir partiyada maksimal 100 ta QR yaratiladi
                  </span>
                )}
              </div>

              {/* Mobile Preview Cards */}
              <div className="md:hidden p-3 space-y-2 max-h-72 overflow-y-auto">
                {bulkItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#1F1F1F] bg-[#000000] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#FAFAFA]">
                          {item.product_name}
                        </div>
                        <div className="text-[10px] font-mono text-[#888888]">
                          {item.category} • {item.batch_number} • {item.expiry_date}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBulkRow(item.id)}
                        className="text-[#525252] hover:text-[#EF4444] p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[#141414]">
                      <span className="text-[11px] text-[#888888]">QR soni:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={item.quantity}
                        onChange={(e) => handleUpdateBulkQty(item.id, Number(e.target.value))}
                        className="w-20 rounded border border-[#262626] bg-[#0A0A0A] px-2 py-1 font-mono text-xs text-white text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Preview Table */}
              <div className="hidden md:block max-h-72 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1F1F1F] bg-[#0A0A0A] text-[10px] font-mono uppercase text-[#666666]">
                    <tr>
                      <th className="px-3.5 py-2">Mahsulot nomi</th>
                      <th className="px-3.5 py-2">Kategoriya</th>
                      <th className="px-3.5 py-2">Partiya</th>
                      <th className="px-3.5 py-2">Muddati</th>
                      <th className="px-3.5 py-2">QR soni</th>
                      <th className="px-3.5 py-2 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141414]">
                    {bulkItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#0D0D0D]">
                        <td className="px-3.5 py-2 font-medium text-[#FAFAFA]">
                          {item.product_name}
                        </td>
                        <td className="px-3.5 py-2 text-[#888888]">{item.category}</td>
                        <td className="px-3.5 py-2 font-mono text-[#888888]">
                          {item.batch_number}
                        </td>
                        <td className="px-3.5 py-2 font-mono text-[#888888]">
                          {item.expiry_date}
                        </td>
                        <td className="px-3.5 py-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateBulkQty(item.id, Number(e.target.value))
                            }
                            className="w-16 rounded border border-[#262626] bg-[#000000] px-2 py-1 font-mono text-xs text-white text-center focus:border-white focus:outline-none"
                          />
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveBulkRow(item.id)}
                            aria-label="Qatorni o‘chirish"
                            className="p-1 text-[#525252] hover:text-[#EF4444]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-[#1F1F1F]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#1F1F1F] bg-[#141414] px-4 py-2.5 text-xs font-medium text-[#888888] hover:text-[#FAFAFA] min-h-[42px]"
            >
              Bekor qilish
            </button>

            <button
              type="button"
              disabled={isSubmitting || bulkItems.length === 0}
              onClick={() => void handleSaveBulkItems()}
              className="flex items-center justify-center space-x-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-40 transition-colors shadow-sm min-h-[42px]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>
                    Hammasini Saqlash ({Math.min(100, totalBulkQrCount)} ta QR-kod)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
