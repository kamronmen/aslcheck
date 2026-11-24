import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { VerifyPage } from './components/VerifyPage';
import { ProducerPage } from './components/ProducerPage';
import { ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

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

      {/* Ultra-minimalist Footer */}
      <footer className="border-t border-[#1F1F1F] bg-[#050505] py-8 text-xs text-[#525252]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-[#888888]" strokeWidth={1.75} />
            <span className="font-semibold text-[#888888]">AslCheck</span>
            <span>•</span>
            <span>Anti-Clone & Authenticity Verification Platform</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="font-mono text-[11px] text-[#525252]">
              {isSupabaseConfigured ? 'Supabase: tjyldhwkvhrtzhgqsbpt' : 'Offline Mock Cache'}
            </span>
            <span>•</span>
            <span>2026 AslCheck Technologies</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
