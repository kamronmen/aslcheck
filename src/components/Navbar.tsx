import React from 'react';
import { CheckCircle2, Factory, Presentation, ArrowUpRight, Film } from 'lucide-react';
import { AslBrandMark, AiCoreIcon } from './Icons';

export const PRESENTATION_URL = 'https://share.gemini.google/5V0IB1DPWl83';

export type NavTab = 'verify' | 'ai' | 'producer';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenVideoGuide?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenVideoGuide,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#18181B] bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('verify')}
          className="flex cursor-pointer items-center space-x-2 sm:space-x-3 transition-opacity hover:opacity-90 shrink-0"
        >
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#27272A] bg-[#0A0A0C] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <AslBrandMark className="h-4 w-4 sm:h-5 sm:w-5 text-white" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="text-[13px] sm:text-base font-semibold tracking-tight text-white">
                AslCheck
              </span>
              <span className="hidden rounded border border-[#1F1F23] bg-[#0A0A0C] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-medium tracking-wide text-[#71717A] sm:inline-block">
                PRO
              </span>
            </div>
            <span className="hidden text-[10px] sm:text-[11px] text-[#71717A] md:block">
              Mahsulot haqiqiyligini tekshirish platformasi
            </span>
          </div>
        </div>

        {/* Center / Right: 3 Segmented Tabs & Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
          <nav className="flex rounded-lg border border-[#1F1F23] bg-[#0A0A0C] p-0.5 sm:p-1 max-w-full">
            {/* 1. Tekshirish Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('verify')}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'verify'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.18)] font-semibold'
                  : 'text-[#71717A] hover:text-white hover:bg-white/5'
              }`}
            >
              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" strokeWidth={1.75} />
              <span>Tekshirish</span>
            </button>

            {/* 2. AslCheck Yordamchi Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`relative flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'ai'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.18)] font-semibold'
                  : 'text-[#71717A] hover:text-white hover:bg-white/5'
              }`}
            >
              <AiCoreIcon
                className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${
                  activeTab === 'ai' ? 'text-black' : 'text-zinc-400'
                }`}
                strokeWidth={1.75}
              />
              <span className="hidden sm:inline">AslCheck Yordamchi</span>
              <span className="sm:hidden">Yordamchi</span>
            </button>

            {/* 3. Ishlab chiqaruvchi / Kabinet Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('producer')}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'producer'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.18)] font-semibold'
                  : 'text-[#71717A] hover:text-white hover:bg-white/5'
              }`}
            >
              <Factory className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="hidden sm:inline">Ishlab chiqaruvchi</span>
              <span className="sm:hidden">Kabinet</span>
            </button>
          </nav>

          {/* Video Guide Trigger Button (Desktop; accessible via Hero Bento & Footer on mobile) */}
          {onOpenVideoGuide && (
            <button
              type="button"
              onClick={onOpenVideoGuide}
              title="Ishlatish yo‘riqnomasi videosini ko‘rish (1:11 min)"
              className="hidden items-center space-x-1.5 rounded-lg border border-[#1F1F23] bg-[#0A0A0C] px-2.5 py-1.5 text-[11px] font-medium text-[#71717A] hover:border-[#27272A] hover:text-white transition-colors sm:inline-flex"
            >
              <Film className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
              <span>Yo‘riqnoma</span>
            </button>
          )}

          {/* Presentation Link (Desktop) */}
          <a
            href={PRESENTATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Loyiha taqdimotini ochish"
            className="hidden items-center space-x-1.5 rounded-lg border border-[#1F1F23] bg-[#0A0A0C] px-2.5 py-1.5 text-[11px] font-medium text-[#71717A] hover:border-[#27272A] hover:text-white transition-colors lg:inline-flex"
          >
            <Presentation className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
            <span>Taqdimot</span>
            <ArrowUpRight className="h-3 w-3 text-[#71717A]" strokeWidth={1.75} />
          </a>

          {/* Clean 'Reyestr faol' Status Pill */}
          <div
            title="Milliy himoyalangan reyestr faol ishlamoqda"
            className="hidden items-center space-x-1.5 rounded-full border border-[#1F1F23] bg-[#0A0A0C] px-2.5 py-1 text-[11px] text-[#71717A] xl:flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <span className="font-medium text-[11px]">Reyestr faol</span>
          </div>
        </div>
      </div>
    </header>
  );
};
