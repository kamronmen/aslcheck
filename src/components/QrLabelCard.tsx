import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Printer } from 'lucide-react';
import { AslBrandMark, VerifiedSealIcon } from './Icons';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="no-print flex items-center justify-between border-b border-[#1F1F1F] px-5 py-4">
          <div className="flex items-center space-x-2">
            <AslBrandMark className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold tracking-tight text-[#FAFAFA]">
              Chop Etiluvchi QR Yorliq
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[#888888] hover:bg-[#141414] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-6">
          <div
            id="printable-qr-area"
            className="mx-auto flex flex-col items-center rounded-xl border border-[#1F1F1F] bg-[#000000] p-6 text-center shadow-inner"
          >
            {/* Brand Header */}
            <div className="flex items-center space-x-1.5 mb-3">
              <AslBrandMark className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
              <span className="text-xs font-bold tracking-tight text-[#FAFAFA] uppercase">
                AslCheck • Rasmiy Pasport
              </span>
            </div>

            {/* QR Canvas Container */}
            <div
              ref={qrRef}
              className="rounded-lg border border-[#222222] bg-white p-3 shadow-md"
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
              <div className="text-sm font-bold text-[#FAFAFA] truncate">
                {product.product_name}
              </div>
              <div className="mt-1 flex items-center justify-center space-x-2">
                <span className="rounded bg-[#141414] px-2 py-0.5 font-mono text-xs font-bold text-[#FAFAFA] border border-[#2A2A2A]">
                  {product.serial_code}
                </span>
                <span className="font-mono text-[11px] text-[#888888]">
                  {product.batch_number}
                </span>
              </div>
              {product.manufacturers?.name && (
                <div className="mt-1.5 text-[11px] text-[#888888] truncate">
                  {product.manufacturers.name}
                </div>
              )}

              <div className="mt-3 border-t border-[#141414] pt-2.5 text-[10px] text-[#525252]">
                Kamerada skanerlab asl nusxasini tekshiring:
                <div className="font-mono text-[#888888] truncate mt-0.5">
                  {verificationUrl}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-center space-x-1 text-[10px] text-[#10B981]">
                <VerifiedSealIcon className="h-3 w-3" strokeWidth={1.75} />
                <span>Anti-Clone Texnologiyasi Bilan Himoyalangan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="no-print border-t border-[#1F1F1F] bg-[#050505] px-5 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#1F1F1F] bg-[#111111] px-3.5 py-2 text-xs font-medium text-[#888888] hover:text-[#FAFAFA] hover:bg-[#161616] transition-colors"
          >
            Yopish
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center space-x-1.5 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3.5 py-2 text-xs font-medium text-[#FAFAFA] hover:bg-[#1E1E1E] transition-colors"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>PNG yuklab olish</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-lg bg-[#FAFAFA] px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#E5E5E5] transition-colors"
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
