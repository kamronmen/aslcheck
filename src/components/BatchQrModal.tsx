import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Printer } from 'lucide-react';
import { AslBrandMark } from './Icons';
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

  if (!isOpen || products.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto max-h-[92dvh] flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] shadow-2xl">
        {/* Header (hidden in print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1F1F1F] px-4 sm:px-6 py-3.5 sm:py-4 gap-3 bg-[#0D0D0D]">
          <div className="flex items-center space-x-2.5">
            <AslBrandMark className="h-5 w-5 text-[#FAFAFA] shrink-0" strokeWidth={1.5} />
            <div>
              <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-[#FAFAFA]">
                A4 Chop Etish Uchun Partiyali QR-kodlar ({products.length} ta)
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#888888]">
                Barcha qadoqlarga yopishtirish uchun tayyor unikal yorliqlar
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-lg bg-[#FAFAFA] px-3.5 py-2 text-xs font-semibold text-black hover:bg-[#E5E5E5] transition-colors shadow-sm min-h-[38px]"
            >
              <Printer className="h-4 w-4" strokeWidth={2} />
              <span>Chop etish (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#888888] hover:bg-[#141414] hover:text-[#FAFAFA] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Printable Grid Area */}
        <div
          ref={printableAreaRef}
          id="batch-printable-area"
          className="p-6 bg-[#000000] max-h-[75vh] overflow-y-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((p) => {
              const verifyUrl = `${window.location.origin}/?code=${encodeURIComponent(
                p.serial_code
              )}`;

              return (
                <div
                  key={p.id}
                  className="batch-label-item rounded-xl border border-[#222222] bg-[#050505] p-4 flex flex-col items-center text-center shadow-sm"
                >
                  <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#888888] mb-2 flex items-center space-x-1">
                    <AslBrandMark className="h-3 w-3 text-[#FAFAFA]" strokeWidth={1.75} />
                    <span>AslCheck • Rasmiy Qadoq</span>
                  </div>

                  <div className="rounded-lg bg-white p-2.5 shadow-sm border border-[#333333]">
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
                    <div className="text-xs font-bold text-[#FAFAFA] truncate">
                      {p.product_name}
                    </div>
                    <div className="mt-1 flex items-center justify-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-[#FAFAFA] bg-[#141414] px-2 py-0.5 rounded border border-[#262626]">
                        {p.serial_code}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#525252] font-mono truncate">
                      {p.batch_number} • {p.manufacturers?.name || 'AslCheck Hamkor'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer (hidden in print) */}
        <div className="no-print border-t border-[#1F1F1F] bg-[#050505] px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-[#525252]">
            Maslahat: Printer sozlamalarida &quot;Margins: None&quot; yoki &quot;Minimal&quot; qilib qo‘ying.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#1F1F1F] bg-[#141414] px-4 py-1.5 text-xs text-[#888888] hover:text-[#FAFAFA]"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
