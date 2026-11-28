import React, { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Printer } from 'lucide-react';
import { AslBrandMark } from './Icons';
import { deriveScratchPin } from '../lib/api';
import type { ProductWithManufacturer } from '../types';

interface BatchQrModalProps {
  products: ProductWithManufacturer[];
  isOpen: boolean;
  onClose: () => void;
}

export const BatchQrModal: React.FC<BatchQrModalProps> = ({
  products,
  isOpen,
  onClose,
}) => {
  const printableAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || products.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Partiyali QR-kodlar"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl my-auto max-h-[92dvh] flex flex-col overflow-hidden rounded-2xl border border-[#1F1F23] border-t-white/[0.1] bg-[#0A0A0C] shadow-[0_24px_70px_rgba(0,0,0,0.95)]"
      >
        {/* Header (hidden in print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#18181B] px-4 sm:px-6 py-3.5 sm:py-4 gap-3 bg-[#0A0A0C]">
          <div className="flex items-center space-x-2.5">
            <AslBrandMark className="h-5 w-5 text-white shrink-0" strokeWidth={1.5} />
            <div>
              <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-white">
                A4 Chop Etish Uchun Partiyali QR-kodlar ({products.length} ta)
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#71717A]">
                Barcha qadoqlarga yopishtirish uchun tayyor unikal yorliqlar va 2FA Skretch-PIN kodlar
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#F4F4F5] transition-all shadow-[0_0_20px_rgba(255,255,255,0.16)] min-h-[38px]"
            >
              <Printer className="h-4 w-4" strokeWidth={2} />
              <span>Chop etish (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#71717A] hover:bg-white/5 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Printable Grid Area */}
        <div
          ref={printableAreaRef}
          id="batch-printable-area"
          className="p-6 bg-black max-h-[75vh] overflow-y-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((p) => {
              const verifyUrl = `${window.location.origin}/?code=${encodeURIComponent(
                p.serial_code
              )}`;
              const pin = p.scratch_pin || deriveScratchPin(p.serial_code);

              return (
                <div
                  key={p.id}
                  className="batch-label-item rounded-xl border border-[#1F1F23] bg-[#050507] p-4 flex flex-col items-center text-center"
                >
                  <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#71717A] mb-2 flex items-center space-x-1">
                    <AslBrandMark className="h-3 w-3 text-white" strokeWidth={1.75} />
                    <span>AslCheck • Rasmiy Qadoq</span>
                  </div>

                  <div className="rounded-lg bg-white p-2.5 shadow-sm border border-[#1F1F23]">
                    <QRCodeCanvas
                      value={verifyUrl}
                      size={140}
                      level="H"
                      marginSize={1}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>

                  <div className="mt-3 w-full">
                    <div className="text-xs font-bold text-white truncate">
                      {p.product_name}
                    </div>
                    <div className="mt-1 flex items-center justify-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-white bg-black px-2 py-0.5 rounded-md border border-[#1F1F23]">
                        {p.serial_code}
                      </span>
                      <span className="font-mono text-[10px] text-[#A1A1AA] bg-black px-1.5 py-0.5 rounded-md border border-[#1F1F23]">
                        PIN: {pin}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#71717A] font-mono truncate">
                      {p.batch_number} • {p.manufacturers?.name || 'AslCheck Hamkor'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer (hidden in print) */}
        <div className="no-print border-t border-[#18181B] bg-[#050507] px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-[#71717A]">
            Maslahat: Printer sozlamalarida &quot;Margins: None&quot; yoki &quot;Minimal&quot; qilib qo‘ying.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#1F1F23] bg-black px-4 py-1.5 text-xs text-[#71717A] hover:text-white"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
