import React from 'react';
import { CheckCircle2, Factory } from 'lucide-react';
import { AslBrandMark, AiCoreIcon } from './Icons';

export type NavTab = 'verify' | 'ai' | 'producer';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1F1F1F] bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('verify')}
          className="flex cursor-pointer items-center space-x-2 sm:space-x-3 transition-opacity hover:opacity-90 shrink-0"
        >
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-[#262626] bg-[#141414]">
            <AslBrandMark className="h-4 w-4 sm:h-5 sm:w-5 text-[#FAFAFA]" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm sm:text-base font-semibold tracking-tight text-[#FAFAFA]">
                AslCheck
              </span>
              <span className="hidden rounded border border-[#2A2A2A] bg-[#141414] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-medium tracking-wide text-[#888888] sm:inline-block">
                PRO
              </span>
            </div>
            <span className="hidden text-[10px] sm:text-[11px] text-[#525252] md:block">
              Mahsulot haqiqiyligini tekshirish platformasi
            </span>
          </div>
        </div>

        {/* Center / Right: 3 Segmented Tabs & Status */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <nav className="flex rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] p-0.5 sm:p-1 max-w-full">
            {/* 1. Tekshirish Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('verify')}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'verify'
                  ? 'bg-[#FAFAFA] text-black shadow-sm font-semibold'
                  : 'text-[#888888] hover:text-[#FAFAFA] hover:bg-[#141414]'
              }`}
            >
              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" strokeWidth={1.75} />
              <span>Tekshirish</span>
            </button>

            {/* 2. AI Ekspert Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`relative flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'ai'
                  ? 'bg-[#FAFAFA] text-black shadow-sm font-semibold'
                  : 'text-[#888888] hover:text-[#FAFAFA] hover:bg-[#141414]'
              }`}
            >
              <AiCoreIcon
                className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${
                  activeTab === 'ai' ? 'text-black' : 'text-zinc-300'
                }`}
                strokeWidth={1.75}
              />
              <span>AI Ekspert</span>
            </button>

            {/* 3. Ishlab chiqaruvchi / Kabinet Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('producer')}
              className={`flex items-center space-x-1 sm:space-x-1.5 rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'producer'
                  ? 'bg-[#FAFAFA] text-black shadow-sm font-semibold'
                  : 'text-[#888888] hover:text-[#FAFAFA] hover:bg-[#141414]'
              }`}
            >
              <Factory className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="hidden sm:inline">Ishlab chiqaruvchi</span>
              <span className="sm:hidden">Kabinet</span>
            </button>
          </nav>

          {/* Clean 'Reyestr faol' Status Pill */}
          <div
            title="Milliy himoyalangan reyestr faol ishlamoqda"
            className="hidden items-center space-x-1.5 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-1 text-[11px] text-[#10B981] lg:flex"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-medium text-[11px]">Reyestr faol</span>
          </div>
        </div>
      </div>
    </header>
  );
};
