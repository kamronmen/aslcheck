import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Building2,
  MapPin,
  FileBadge2,
  Phone,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { AslBrandMark, VerifiedSealIcon } from './Icons';
import {
  loginProducerAccount,
  registerProducerAccount,
  enterDemoProducerMode,
} from '../lib/api';
import type { Manufacturer } from '../types';

interface ProducerAuthProps {
  onAuthenticated: (manufacturer: Manufacturer, isDemo: boolean) => void;
}

export const ProducerAuth: React.FC<ProducerAuthProps> = ({ onAuthenticated }) => {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regRegion, setRegRegion] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const manufacturer = await loginProducerAccount(loginEmail, loginPassword);
      onAuthenticated(manufacturer, false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Tizimga kirishda xatolik yuz berdi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (regPassword.length < 6) {
      setErrorMsg('Parol kamida 6 ta belgidan iborat bo‘lishi kerak.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const res = await registerProducerAccount({
        name: regName,
        region: regRegion,
        license_number: regLicense,
        phone: regPhone,
        email: regEmail,
        password: regPassword,
      });

      if (res.requiresEmailConfirmation || !res.manufacturer) {
        setInfoMsg(
          'Hisob yaratildi. Pochtadagi tasdiqlash havolasini bosgandan so‘ng "Kirish" bo‘limi orqali kiring.'
        );
        setAuthTab('login');
        setLoginEmail(regEmail.trim());
      } else {
        onAuthenticated(res.manufacturer, false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Korxonani ro‘yxatdan o‘tkazishda xatolik yuz berdi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoEnter = async () => {
    if (isDemoLoading || isLoading) return;
    setIsDemoLoading(true);
    setErrorMsg(null);
    try {
      const demoMfr = await enterDemoProducerMode();
      onAuthenticated(demoMfr, true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Demo rejimni yuklab bo‘lmadi.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-6 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#222222] bg-[#111111] text-[#FAFAFA] mb-3.5">
            <AslBrandMark className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[#FAFAFA]">
            Ishlab Chiqaruvchi Kabineti
          </h2>
          <p className="mt-1 text-xs text-[#888888] leading-relaxed">
            Har bir korxona uchun alohida izolyatsiyalangan QR pasportlar va xavfsizlik monitoringi
          </p>
        </div>

        {/* Segmented Auth Tabs */}
        <div className="grid grid-cols-2 rounded-lg border border-[#1F1F1F] bg-[#050505] p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthTab('login');
              setErrorMsg(null);
            }}
            className={`rounded-md py-2 text-xs font-medium transition-all ${
              authTab === 'login'
                ? 'bg-[#FAFAFA] text-black font-semibold shadow-sm'
                : 'text-[#888888] hover:text-[#FAFAFA]'
            }`}
          >
            Kirish
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('register');
              setErrorMsg(null);
            }}
            className={`rounded-md py-2 text-xs font-medium transition-all ${
              authTab === 'register'
                ? 'bg-[#FAFAFA] text-black font-semibold shadow-sm'
                : 'text-[#888888] hover:text-[#FAFAFA]'
            }`}
          >
            Ro‘yxatdan o‘tish
          </button>
        </div>

        {/* Error / Info Alerts */}
        {errorMsg && (
          <div className="mb-4 flex items-start space-x-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444] animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 flex items-start space-x-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#10B981] animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <span className="leading-relaxed">{infoMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {authTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1.5">
                Korxona Email Manzili
              </label>
              <div className="relative">
                <Mail className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-3" strokeWidth={1.75} />
                <input
                  type="email"
                  required
                  placeholder="info@korxona.uz"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2.5 pl-9 pr-3 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1.5">
                Parol
              </label>
              <div className="relative">
                <Lock className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-3" strokeWidth={1.75} />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Kamida 6 ta belgi"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2.5 pl-9 pr-3 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !loginEmail.trim() || !loginPassword}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-[#FAFAFA] py-2.5 text-xs font-bold text-black hover:bg-[#E5E5E5] disabled:opacity-40 transition-colors shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  <span>Tekshirilmoqda...</span>
                </>
              ) : (
                <>
                  <span>Kabinetga kirish</span>
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* TAB 2: REGISTER COMPANY */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1">
                Korxona nomi *
              </label>
              <div className="relative">
                <Building2 className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-2.5" strokeWidth={1.75} />
                <input
                  type="text"
                  required
                  placeholder="Masalan: Chiroqchi Asal MCHJ"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2 pl-9 pr-3 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#888888] mb-1">
                  Hudud *
                </label>
                <div className="relative">
                  <MapPin className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-2.5" strokeWidth={1.75} />
                  <input
                    type="text"
                    required
                    placeholder="Qashqadaryo, Chiroqchi"
                    value={regRegion}
                    onChange={(e) => setRegRegion(e.target.value)}
                    className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2 pl-8 pr-2.5 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#888888] mb-1">
                  Litsenziya raqami *
                </label>
                <div className="relative">
                  <FileBadge2 className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-2.5" strokeWidth={1.75} />
                  <input
                    type="text"
                    required
                    placeholder="UZ-CERT-2026-102"
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2 pl-8 pr-2.5 font-mono text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1">
                Aloqa telefoni *
              </label>
              <div className="relative">
                <Phone className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-2.5" strokeWidth={1.75} />
                <input
                  type="tel"
                  required
                  placeholder="+998 90 123 45 67"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2 pl-9 pr-3 font-mono text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-2.5" strokeWidth={1.75} />
                <input
                  type="email"
                  required
                  placeholder="korxona@mail.uz"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2 pl-9 pr-3 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#888888] mb-1">
                Parol (kamida 6 ta belgi) *
              </label>
              <div className="relative">
                <Lock className="h-3.5 w-3.5 text-[#525252] absolute left-3 top-2.5" strokeWidth={1.75} />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F1F] bg-[#000000] py-2 pl-9 pr-3 text-xs text-[#FAFAFA] placeholder-[#525252] focus:border-[#FAFAFA] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-[#FAFAFA] py-2.5 text-xs font-bold text-black hover:bg-[#E5E5E5] disabled:opacity-40 transition-colors shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  <span>Ro‘yxatdan o‘tkazilmoqda...</span>
                </>
              ) : (
                <>
                  <VerifiedSealIcon className="h-4 w-4" strokeWidth={1.75} />
                  <span>Korxonani ro‘yxatdan o‘tkazish</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Subtle Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1A1A1A]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-mono">
            <span className="bg-[#0A0A0A] px-2.5 text-[#525252]">yoki tezkor sinov</span>
          </div>
        </div>

        {/* Stage Demo Shortcut */}
        <button
          type="button"
          onClick={handleDemoEnter}
          disabled={isDemoLoading || isLoading}
          className="flex w-full items-center justify-center space-x-2 rounded-xl border border-[#262626] bg-[#111111] px-3.5 py-2.5 text-xs font-medium text-[#FAFAFA] hover:bg-[#161616] hover:border-[#3A3A3A] disabled:opacity-50 transition-colors"
        >
          {isDemoLoading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#888888]" />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-[#888888]" strokeWidth={1.5} />
          )}
          <span>Demo korxona sifatida kirish (Chiroqchi Tog&apos; Asali)</span>
        </button>
      </div>
    </div>
  );
};
