import React, { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Printer, KeyRound } from 'lucide-react';
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
  const qrRef = useRef<HTMLDivElement | null>(null);

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

  // Download QR canvas as high-res PNG
  const handleDownloadPng = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `AslCheck-${product.serial_code}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // Print single label
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR Yorliq"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
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

        {/* Printable Area */}
        <div className="p-6">
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
        </div>

        {/* Action Buttons */}
        <div className="no-print border-t border-[#18181B] bg-[#050507] px-5 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#1F1F23] bg-black px-3.5 py-2 text-xs font-medium text-[#71717A] hover:text-white hover:border-[#27272A] transition-colors"
          >
            Yopish
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center space-x-1.5 rounded-xl border border-[#27272A] bg-black px-3.5 py-2 text-xs font-medium text-white hover:border-zinc-500 transition-colors"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>PNG yuklab olish</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#F4F4F5] shadow-[0_0_20px_rgba(255,255,255,0.16)] transition-all"
            >
              <Printer className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Chop etish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
