import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Image, AlertCircle, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { validateOfficialQrPayload } from '../lib/qr';

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
  const [phishingAlert, setPhishingAlert] = useState<{ message: string; payload: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeMode, setActiveMode] = useState<'camera' | 'file'>('camera');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  const qrContainerId = 'aslcheck-qr-reader';

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const stopCamera = useCallback(async () => {
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
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    setPhishingAlert(null);
    setIsInitializing(true);

    try {
      await stopCamera();

      const elem = document.getElementById(qrContainerId);
      if (!elem) {
        setIsInitializing(false);
        return;
      }

      const { Html5Qrcode: Html5QrcodeLib } = await import('html5-qrcode');
      const html5QrCode = new Html5QrcodeLib(qrContainerId);
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          const check = validateOfficialQrPayload(decodedText);
          await stopCamera();
          if (!check.isValid || !check.code) {
            setPhishingAlert({
              message: check.reason || 'Xavf! Begona/soxta havola bloklandi (Phishing himoyasi)',
              payload: decodedText.slice(0, 80),
            });
            return;
          }
          onScanSuccessRef.current(check.code);
        },
        () => {
          // Ignore per-frame misses
        }
      );
      setIsInitializing(false);
    } catch (err: unknown) {
      console.error('Camera start error:', err);
      setIsInitializing(false);
      setErrorMsg(
        'Kameraga ulanib bo‘lmadi. Ruxsat berilganligini tekshiring yoki pastdagi "Fayl / Rasm yuklash" usulidan foydalaning.'
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      const timer = setTimeout(() => {
        void startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        void stopCamera();
      };
    }

    void stopCamera();
    return () => {
      void stopCamera();
    };
  }, [isOpen, activeMode, startCamera, stopCamera]);

  const handleModalClose = useCallback(async () => {
    await stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void handleModalClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleModalClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setPhishingAlert(null);
    try {
      const { Html5Qrcode: Html5QrcodeLib } = await import('html5-qrcode');
      const html5QrCode = new Html5QrcodeLib('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      const check = validateOfficialQrPayload(decodedText);
      await stopCamera();
      if (!check.isValid || !check.code) {
        setPhishingAlert({
          message: check.reason || 'Xavf! Begona/soxta havola bloklandi (Phishing himoyasi)',
          payload: decodedText.slice(0, 80),
        });
        return;
      }
      onScanSuccess(check.code);
    } catch (err) {
      console.warn('File QR read error:', err);
      setErrorMsg('Rasmdan QR-kod topilmadi. Aniqroq yoki yorug‘roq rasm tanlang.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="QR-kodni skanerlash"
      onClick={() => void handleModalClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-[#1F1F23] border-t-white/[0.1] bg-[#0A0A0C] shadow-[0_24px_70px_rgba(0,0,0,0.95)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#18181B] px-5 py-4">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-white" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold tracking-tight text-white">
              QR-kodni skanerlash
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void handleModalClose()}
            aria-label="Yopish"
            className="rounded-lg p-1.5 text-[#71717A] hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[#18181B] bg-black p-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeMode === 'camera'
                ? 'bg-white text-black font-semibold'
                : 'text-[#71717A] hover:text-white'
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
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeMode === 'file'
                ? 'bg-white text-black font-semibold'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            Fayl / Rasm yuklash
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {activeMode === 'camera' ? (
            <div className="flex flex-col items-center">
              <div className="relative w-full aspect-square max-w-[280px] overflow-hidden rounded-xl border border-[#1F1F23] bg-black">
                <div id={qrContainerId} className="w-full h-full" />

                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 space-y-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" strokeWidth={1.75} />
                    <span className="text-xs text-[#71717A]">Kamera ishga tushmoqda...</span>
                  </div>
                )}

                {!isInitializing && !errorMsg && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-44 w-44 rounded-lg border-2 border-dashed border-white/40 relative">
                      <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-white" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-white" />
                      <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-white" />
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-white" />
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-[#71717A]">
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
                className="flex flex-col items-center justify-center w-full max-w-[280px] aspect-square rounded-xl border-2 border-dashed border-[#1F1F23] bg-[#050507] hover:bg-[#141418] hover:border-zinc-500 transition-colors p-6 cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1F1F23] bg-black mb-3">
                  <Image className="h-6 w-6 text-white" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium text-white">
                  QR-kod rasmini tanlang
                </span>
                <span className="mt-1 text-[11px] text-[#71717A] text-center">
                  PNG, JPG yoki skrinshot
                </span>
              </button>
              <div id="file-scanner-temp" className="hidden" />
            </div>
          )}

          {phishingAlert && (
            <div className="mt-4 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-3.5 text-xs text-[#EF4444] space-y-2 animate-in fade-in">
              <div className="flex items-start space-x-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2} />
                <div className="flex-1 space-y-1">
                  <div className="font-bold leading-snug">{phishingAlert.message}</div>
                  <div className="rounded bg-black/70 border border-[#EF4444]/25 px-2 py-1 font-mono text-[10px] text-zinc-300 break-all">
                    Bloklangan manba: {phishingAlert.payload}
                  </div>
                </div>
              </div>
              {activeMode === 'camera' && (
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="w-full rounded-lg border border-[#EF4444]/30 bg-black px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#141418] transition-colors"
                >
                  Kamerani qayta yoqish
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 flex items-start space-x-2.5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#18181B] bg-[#050507] px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center space-x-1.5 text-[10px] font-mono text-[#71717A]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.75} />
            <span>Phishing himoyasi faol</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={async () => {
                await stopCamera();
                setPhishingAlert({
                  message: 'Xavf! Begona/soxta havola bloklandi (Phishing himoyasi)',
                  payload: 'https://soxta-sayt-phishing.uz/?code=FAKE',
                });
              }}
              className="rounded-lg border border-[#1F1F23] bg-black px-2.5 py-1.5 text-[10px] font-mono text-[#71717A] hover:text-white hover:border-[#27272A] transition-colors"
            >
              Phishing sinovi
            </button>
            <button
              type="button"
              onClick={() => void handleModalClose()}
              className="rounded-lg border border-[#1F1F23] bg-black px-3.5 py-1.5 text-xs font-medium text-white hover:border-[#27272A] transition-colors"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
