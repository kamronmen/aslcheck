import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Printer, KeyRound, Receipt } from 'lucide-react';
import { AslBrandMark, VerifiedSealIcon } from './Icons';
import { deriveScratchPin } from '../lib/api';
import type { ProductWithManufacturer } from '../types';

interface QrLabelCardProps {
  product: ProductWithManufacturer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QrLabelCard: React.FC<QrLabelCardProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [labelMode, setLabelMode] = useState<'standard' | 'thermal58'>('standard');
  const qrRef = useRef<HTMLDivElement | null>(null);
  const thermalQrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const verificationUrl = `${window.location.origin}/?code=${encodeURIComponent(
    product.serial_code
  )}`;

  // Download crisp PNG (Standard QR or 384px-wide 58mm Thermal Sticker PNG for phone Bluetooth printers)
  const handleDownloadPng = () => {
    if (labelMode === 'thermal58') {
      const qrCanvas = thermalQrRef.current?.querySelector('canvas');
      if (!qrCanvas) return;

      // 384px = exact native 203 DPI width of 58mm mini thermal printers
      const outCanvas = document.createElement('canvas');
      outCanvas.width = 384;
      outCanvas.height = 470;
      const ctx = outCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px Inter, system-ui, sans-serif';
      ctx.fillText('AslCheck PRO', 192, 42);

      // Divider under brand header
      ctx.fillRect(32, 56, 320, 2);

      // Draw crisp QR in center
      const qrSize = 264;
      const qrX = (384 - qrSize) / 2;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrCanvas, qrX, 74, qrSize, qrSize);

      // Serial code
      ctx.font = 'bold 24px monospace';
      ctx.fillText(product.serial_code, 192, 376);

      // Dashed divider line
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(32, 396);
      ctx.lineTo(352, 396);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Verification instruction
      ctx.font = 'bold 20px Inter, system-ui, sans-serif';
      ctx.fillText('Haqiqiyligini tekshiring', 192, 434);

      const link = document.createElement('a');
      link.download = `AslCheck-58mm-${product.serial_code}.png`;
      link.href = outCanvas.toDataURL('image/png', 1.0);
      link.click();
      return;
    }

    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `AslCheck-${product.serial_code}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // Print active mode
  const handlePrint = () => {
    window.print();
  };

  // Switch straight to 58mm thermal mode & trigger print
  const handlePrintThermal58 = () => {
    if (labelMode !== 'thermal58') {
      setLabelMode('thermal58');
      window.setTimeout(() => {
        window.print();
      }, 120);
    } else {
      window.print();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR Yorliq"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      {/* Dynamic 58mm @page sizing when Mini Thermal Printer mode is active */}
      {labelMode === 'thermal58' && (
        <style>{`@media print { @page { size: 58mm auto; margin: 0mm; } }`}</style>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border border-[#1F1F23] border-t-white/[0.1] bg-[#0A0A0C] shadow-[0_24px_70px_rgba(0,0,0,0.95)]"
      >
        {/* Header */}
        <div className="no-print flex items-center justify-between border-b border-[#18181B] px-5 py-4">
          <div className="flex items-center space-x-2">
            <AslBrandMark className="h-4 w-4 text-white" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold tracking-tight text-white">
              Chop Etiluvchi QR Yorliq
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-[#71717A] hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Mode Switcher Tabs: Standart Pasport vs 58mm Mini Thermal Printer */}
        <div className="no-print border-b border-[#18181B] bg-black/60 px-5 py-2.5">
          <div className="grid grid-cols-2 rounded-xl border border-[#1F1F23] bg-black p-1">
            <button
              type="button"
              onClick={() => setLabelMode('standard')}
              className={`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                labelMode === 'standard'
                  ? 'bg-white text-black font-semibold shadow-[0_0_16px_rgba(255,255,255,0.14)]'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Standart Pasport</span>
            </button>

            <button
              type="button"
              onClick={() => setLabelMode('thermal58')}
              className={`flex items-center justify-center space-x-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                labelMode === 'thermal58'
                  ? 'bg-white text-black font-semibold shadow-[0_0_16px_rgba(255,255,255,0.14)]'
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>58mm Mini Printer</span>
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6">
          {labelMode === 'standard' ? (
            <div
              id="printable-qr-area"
              className="mx-auto flex flex-col items-center rounded-xl border border-[#1F1F23] bg-black p-6 text-center shadow-inner"
            >
              {/* Brand Header */}
              <div className="flex items-center space-x-1.5 mb-3">
                <AslBrandMark className="h-4 w-4 text-white" strokeWidth={1.75} />
                <span className="text-xs font-bold tracking-tight text-white uppercase">
                  AslCheck • Rasmiy Pasport
                </span>
              </div>

              {/* QR Canvas Container */}
              <div
                ref={qrRef}
                className="rounded-lg border border-[#1F1F23] bg-white p-3 shadow-md"
              >
                <QRCodeCanvas
                  value={verificationUrl}
                  size={200}
                  level="H"
                  marginSize={1}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>

              {/* Product Meta */}
              <div className="mt-4 w-full">
                <div className="text-sm font-bold text-white truncate">
                  {product.product_name}
                </div>
                <div className="mt-1.5 flex items-center justify-center space-x-2">
                  <span className="rounded bg-[#0A0A0C] px-2 py-0.5 font-mono text-xs font-bold text-white border border-[#1F1F23]">
                    {product.serial_code}
                  </span>
                  <span className="font-mono text-[11px] text-[#71717A]">
                    {product.batch_number}
                  </span>
                </div>
                {product.manufacturers?.name && (
                  <div className="mt-1.5 text-[11px] text-[#71717A] truncate">
                    {product.manufacturers.name}
                  </div>
                )}

                {/* 2FA Internal Scratch PIN for box assembly */}
                <div className="mt-3 rounded-lg border border-dashed border-[#27272A] bg-[#050507] px-3 py-2 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center space-x-1 text-[#71717A]">
                    <KeyRound className="h-3 w-3 text-zinc-400" strokeWidth={1.75} />
                    <span>Ichki Skretch-PIN:</span>
                  </span>
                  <span className="font-mono font-bold tracking-widest text-white">
                    {product.scratch_pin || deriveScratchPin(product.serial_code)}
                  </span>
                </div>

                <div className="mt-3 border-t border-[#18181B] pt-2.5 text-[10px] text-[#71717A]">
                  Kamerada skanerlab asl nusxasini tekshiring:
                  <div className="font-mono text-[#A1A1AA] truncate mt-0.5">
                    {verificationUrl}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-center space-x-1 text-[10px] text-zinc-400">
                  <VerifiedSealIcon className="h-3 w-3 text-zinc-300" strokeWidth={1.75} />
                  <span>Anti-Clone & 2FA Skretch-PIN Bilan Himoyalangan</span>
                </div>
              </div>
            </div>
          ) : (
            /* 58mm Mini Thermal Printer Sticker Mode (Pure high-contrast #FFFFFF / #000000) */
            <div className="space-y-4">
              <div
                id="printable-thermal-58mm"
                className="mx-auto w-[232px] bg-white text-black rounded-lg border border-zinc-300 px-4 py-4 flex flex-col items-center text-center shadow-[0_14px_40px_rgba(0,0,0,0.65)]"
              >
                <div className="w-full border-b-2 border-black pb-1.5 mb-3 text-xs font-extrabold tracking-wider uppercase text-black">
                  AslCheck PRO
                </div>

                <div ref={thermalQrRef} className="bg-white p-1">
                  <QRCodeCanvas
                    value={verificationUrl}
                    size={164}
                    level="H"
                    marginSize={1}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>

                <div className="mt-2.5 w-full font-mono text-sm font-extrabold tracking-wider text-black">
                  {product.serial_code}
                </div>

                <div className="mt-2 w-full border-t border-dashed border-black pt-1.5 text-[11px] font-bold text-black">
                  Haqiqiyligini tekshiring
                </div>
              </div>

              <p className="no-print text-center text-[11px] text-[#71717A] leading-relaxed">
                58mm termoprinter (stiker) o‘lchamida yuqori kontrastli oq-qora yorliq. Bluetooth telefon ilovalari uchun PNG stiker yuklab olishingiz ham mumkin.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="no-print border-t border-[#18181B] bg-[#050507] px-5 py-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#1F1F23] bg-black px-3 py-2 text-xs font-medium text-[#71717A] hover:text-white hover:border-[#27272A] transition-colors"
          >
            Yopish
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center space-x-1.5 rounded-xl border border-[#27272A] bg-black px-3 py-2 text-xs font-medium text-white hover:border-zinc-500 transition-colors"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>{labelMode === 'thermal58' ? '58mm Stiker PNG' : 'PNG yuklab olish'}</span>
            </button>

            {labelMode === 'standard' ? (
              <>
                <button
                  type="button"
                  onClick={handlePrintThermal58}
                  className="flex items-center space-x-1.5 rounded-xl border border-[#27272A] bg-[#0A0A0C] px-3 py-2 text-xs font-semibold text-white hover:border-zinc-500 transition-colors"
                >
                  <Receipt className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>58mm Mini Printerda chop etish</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#F4F4F5] shadow-[0_0_20px_rgba(255,255,255,0.16)] transition-all"
                >
                  <Printer className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Chop etish</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-[#F4F4F5] shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all"
              >
                <Receipt className="h-3.5 w-3.5" strokeWidth={2} />
                <span>58mm Mini Printerda chop etish</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
