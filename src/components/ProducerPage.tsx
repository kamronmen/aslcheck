import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Building2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ProductWithManufacturer, NewProductPayload } from '../types';
import { fetchProducerProducts, createProduct } from '../lib/api';
import { QrLabelCard } from './QrLabelCard';

export const ProducerPage: React.FC = () => {
  const [products, setProducts] = useState<ProductWithManufacturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductForQr, setSelectedProductForQr] = useState<ProductWithManufacturer | null>(null);

  // Form State
  const generateRandomSerial = () =>
    `ASL-2026-${Math.floor(100 + Math.random() * 900)}`;

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
  const [formSerialCode, setFormSerialCode] = useState(generateRandomSerial());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load products
  const loadData = async () => {
    setIsLoading(true);
    try {
      const items = await fetchProducerProducts();
      setProducts(items);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate KPIs
  const totalProducts = products.length;
  const totalScans = products.reduce((acc, p) => acc + (p.scan_count || 0), 0);
  const suspiciousCount = products.filter(
    (p) => p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3)
  ).length;

  // Handle Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || isSubmitting) return;

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

      const created = await createProduct(payload);

      // Reset form
      setFormName('');
      setFormIngredients('');
      setFormBatch(`BATCH-2026-${Math.floor(10 + Math.random() * 90)}`);
      setFormSerialCode(generateRandomSerial());
      setShowAddForm(false);

      // Refresh list
      await loadData();

      // Open QR card for created product
      setSelectedProductForQr(created);
    } catch (err) {
      console.error('Failed to create product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered products
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Producer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1F1F1F]">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FAFAFA]">
              Ishlab Chiqaruvchi Boshqaruv Paneli
            </h1>
            <span className="rounded border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-medium text-[#10B981]">
              Tasdiqlangan
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-2 text-xs text-[#888888]">
            <Building2 className="h-3.5 w-3.5 text-[#525252]" strokeWidth={1.75} />
            <span>Chiroqchi Tog‘ Asali MCHJ (Litsenziya: UZ-CERT-2026-8841)</span>
          </div>
        </div>

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
      </div>

      {/* Top KPI Row */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 */}
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

        {/* KPI 2 */}
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

        {/* KPI 3 */}
        <div className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] p-5">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-medium">Shubhali / Shikoyatlar</span>
            <AlertTriangle className="h-4 w-4 text-[#F59E0B]" strokeWidth={1.75} />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono text-[#F59E0B]">
              {suspiciousCount}
            </span>
            <span className="text-xs text-[#525252]">ta ogohlantirish</span>
          </div>
        </div>
      </div>

      {/* Collapsible Add Product Form */}
      {showAddForm && (
        <div className="mt-6 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] p-5 sm:p-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-[#1F1F1F]">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold text-[#FAFAFA]">
                Yangi mahsulotni ro‘yxatga olish
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
              {/* Product Name */}
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

              {/* Category */}
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

              {/* Serial Code (Auto-generated & Editable) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#888888]">
                    Unikal seriya kodi *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormSerialCode(generateRandomSerial())}
                    className="text-[10px] text-[#888888] hover:text-[#FAFAFA] underline"
                  >
                    Qaytadan yaratish
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formSerialCode}
                  onChange={(e) => setFormSerialCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] px-3.5 py-2 font-mono text-xs font-semibold text-[#FAFAFA] focus:border-[#FAFAFA] focus:outline-none"
                />
              </div>

              {/* Batch Number */}
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

              {/* Manufacture Date */}
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

              {/* Expiry Date */}
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

              {/* Max Safe Scans */}
              <div>
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
                  Ushbu sondan ko‘p skaner qilinganda nusxalangan deb belgilanadi.
                </span>
              </div>

              {/* Ingredients */}
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
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Saqlash va QR-kod yaratish</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Registered Products Table Section */}
      <div className="mt-8 rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] overflow-hidden shadow-2xl">
        {/* Table Controls */}
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

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1F1F1F] bg-[#050505] text-[#525252] font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Seriya Kodi</th>
                <th className="px-4 py-3">Mahsulot Nomi</th>
                <th className="px-4 py-3 hidden md:table-cell">Kategoriya</th>
                <th className="px-4 py-3 hidden sm:table-cell">Partiya</th>
                <th className="px-4 py-3">Skaner Soni</th>
                <th className="px-4 py-3">Holati</th>
                <th className="px-4 py-3 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414] text-[#FAFAFA]">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#525252]">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#888888]" />
                    <span>Mahsulotlar yuklanmoqda...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#525252]">
                    Mahsulot topilmadi.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSuspicious =
                    p.is_flagged || (p.scan_count || 0) > (p.max_safe_scans || 3);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#111111] transition-colors"
                    >
                      {/* Serial Code */}
                      <td className="px-4 py-3 font-mono font-semibold text-[#FAFAFA]">
                        <span className="rounded bg-[#141414] border border-[#222222] px-2 py-0.5">
                          {p.serial_code}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="px-4 py-3 font-medium">
                        <div>{p.product_name}</div>
                        <div className="text-[10px] text-[#525252] sm:hidden mt-0.5">
                          {p.batch_number} • {p.category}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-[#888888] hidden md:table-cell">
                        {p.category}
                      </td>

                      {/* Batch */}
                      <td className="px-4 py-3 font-mono text-[#888888] hidden sm:table-cell">
                        {p.batch_number}
                      </td>

                      {/* Scan Count */}
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

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isSuspicious ? (
                          <span className="inline-flex items-center space-x-1 rounded border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium text-[#F59E0B]">
                            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                            <span>Shubhali</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                            <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                            <span>Faol</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForQr(p)}
                          className="inline-flex items-center space-x-1.5 rounded-md border border-[#222222] bg-[#141414] px-2.5 py-1 text-xs font-medium text-[#FAFAFA] hover:bg-[#1E1E1E] transition-colors"
                        >
                          <QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />
                          <span>QR-kod</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Label Modal */}
      <QrLabelCard
        product={selectedProductForQr}
        isOpen={Boolean(selectedProductForQr)}
        onClose={() => setSelectedProductForQr(null)}
      />
    </div>
  );
};
