import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Image, AlertCircle, RefreshCw } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeMode, setActiveMode] = useState<'camera' | 'file'>('camera');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrContainerId = 'aslcheck-qr-reader';

  // Helper to extract serial code from raw text or URL
  const extractSerialCode = (rawText: string): string => {
    const text = rawText.trim();
    try {
      if (text.includes('?code=') || text.includes('&code=')) {
        // Try parsing URL
        const parsedUrl = new URL(text.startsWith('http') ? text : `https://dummy.uz/${text}`);
        const codeParam = parsedUrl.searchParams.get('code');
        if (codeParam) return codeParam.trim().toUpperCase();
      }
    } catch {
      // Not a standard URL, continue with regex or raw text
    }

    // Match ASL-2026-XXX or similar pattern if embedded in text
    const match = text.match(/[A-Z0-9]{3,}-[0-9]{4}-[A-Z0-9]{3,}/i);
    if (match) {
      return match[0].toUpperCase();
    }

    return text.toUpperCase();
  };

  // Stop camera helper
  const stopCamera = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      } finally {
        qrScannerRef.current = null;
      }
    }
  };

  // Start live camera
  const startCamera = async () => {
    setErrorMsg(null);
    setIsInitializing(true);

    try {
      await stopCamera();

      // Ensure element exists in DOM
      const elem = document.getElementById(qrContainerId);
      if (!elem) {
        setIsInitializing(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(qrContainerId);
      qrScannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          const code = extractSerialCode(decodedText);
          await stopCamera();
          onScanSuccess(code);
        },
        () => {
          // Frame callback, ignored to prevent console spam
        }
      );
      setIsInitializing(false);
    } catch (err: unknown) {
      console.error('Camera start error:', err);
      setIsInitializing(false);
      setErrorMsg(
        'Kameraga ulanib bo‘lmadi. Ruxsat berilganligini tekshiring yoki pastdagi "Fayldan yuklash" usulidan foydalaning.'
      );
    }
  };

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  const handleModalClose = async () => {
    await stopCamera();
    onClose();
  };

  // Handle local file scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      const code = extractSerialCode(decodedText);
      await stopCamera();
      onScanSuccess(code);
    } catch (err) {
      console.warn('File QR read error:', err);
      setErrorMsg('Rasmdan QR-kod topilmadi. Aniqroq yoki yorug‘roq rasm tanlang.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F1F1F] px-5 py-4">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-[#FAFAFA]" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold tracking-tight text-[#FAFAFA]">
              QR-kodni skanerlash
            </h3>
          </div>
          <button
            onClick={handleModalClose}
            className="rounded-md p-1.5 text-[#888888] hover:bg-[#141414] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[#1F1F1F] bg-[#050505] p-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeMode === 'camera'
                ? 'bg-[#141414] text-[#FAFAFA] border border-[#262626]'
                : 'text-[#888888] hover:text-[#FAFAFA]'
            }`}
          >
            Jonli Kamera
          </button>
          <button
            type="button"
            onClick={async () => {
              await stopCamera();
              setActiveMode('file');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeMode === 'file'
                ? 'bg-[#141414] text-[#FAFAFA] border border-[#262626]'
                : 'text-[#888888] hover:text-[#FAFAFA]'
            }`}
          >
            Fayl / Rasm yuklash
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {activeMode === 'camera' ? (
            <div className="flex flex-col items-center">
              {/* Camera Container with overlay view */}
              <div className="relative w-full aspect-square max-w-[280px] overflow-hidden rounded-lg border border-[#1F1F1F] bg-black">
                <div id={qrContainerId} className="w-full h-full" />

                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 space-y-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-[#888888]" strokeWidth={1.75} />
                    <span className="text-xs text-[#888888]">Kamera ishga tushmoqda...</span>
                  </div>
                )}

                {/* Minimalist target border frame */}
                {!isInitializing && !errorMsg && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-44 w-44 rounded-lg border-2 border-dashed border-[#FAFAFA]/40 relative">
                      <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-[#FAFAFA]" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-[#FAFAFA]" />
                      <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-[#FAFAFA]" />
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-[#FAFAFA]" />
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-[#888888]">
                Kamerani mahsulot qadog‘idagi AslCheck QR-kodiga qarating
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full max-w-[280px] aspect-square rounded-lg border-2 border-dashed border-[#1F1F1F] bg-[#0A0A0A] hover:bg-[#141414] hover:border-[#333333] transition-colors p-6 cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#222222] bg-[#111111] mb-3">
                  <Image className="h-6 w-6 text-[#FAFAFA]" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium text-[#FAFAFA]">
                  QR-kod rasmini tanlang
                </span>
                <span className="mt-1 text-[11px] text-[#525252] text-center">
                  PNG, JPG yoki skrinshot
                </span>
              </button>
              {/* Hidden element for file scanning */}
              <div id="file-scanner-temp" className="hidden" />
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 flex items-start space-x-2.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1F1F1F] bg-[#050505] px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={handleModalClose}
            className="rounded-md border border-[#1F1F1F] bg-[#111111] px-3.5 py-1.5 text-xs font-medium text-[#FAFAFA] hover:bg-[#1a1a1a] transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
