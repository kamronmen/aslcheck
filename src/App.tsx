import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { VerifyPage } from './components/VerifyPage';
import { ProducerPage } from './components/ProducerPage';
import { ShieldCheck } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'verify' | 'producer'>('verify');

  return (
    <div className="min-h-screen bg-black text-[#FAFAFA] flex flex-col font-sans selection:bg-[#333333] selection:text-white">
      {/* Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'verify' ? <VerifyPage /> : <ProducerPage />}
      </main>

      {/* Ultra-minimalist Footer (Feature 6) */}
      <footer className="border-t border-[#1F1F1F] bg-[#050505] py-8 text-xs text-[#525252]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-[#888888]" strokeWidth={1.75} />
            <span className="font-semibold text-[#888888]">AslCheck</span>
            <span>—</span>
            <span>Milliy mahsulotlar haqiqiyligi reyestri</span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-[#525252]">
            <span>2026</span>
            <span>•</span>
            <span>O‘zbekiston Respublikasi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
