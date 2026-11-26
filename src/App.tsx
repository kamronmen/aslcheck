import { useState, useEffect } from 'react';
import { Navbar, type NavTab } from './components/Navbar';
import { VerifyPage } from './components/VerifyPage';
import { ProducerPage } from './components/ProducerPage';
import { AiExpertPage } from './components/AiExpertPage';
import { AslBrandMark } from './components/Icons';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getInitialTabFromUrl(): NavTab {
  if (typeof window === 'undefined') return 'verify';
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';

  if (
    params.get('tab') === 'producer' ||
    hash.includes('access_token=') ||
    hash.includes('type=signup') ||
    hash.includes('type=recovery') ||
    UUID_REGEX.test(params.get('code') || '')
  ) {
    return 'producer';
  }
  return 'verify';
}

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTabFromUrl);
  const [initialAiQuestion, setInitialAiQuestion] = useState<string>('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const hash = window.location.hash || '';
        const params = new URLSearchParams(window.location.search);
        if (
          hash.includes('access_token=') ||
          params.get('tab') === 'producer' ||
          UUID_REGEX.test(params.get('code') || '')
        ) {
          setActiveTab('producer');
        }
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleNavigateToAi = (question?: string) => {
    if (question) {
      setInitialAiQuestion(question);
    }
    setActiveTab('ai');
  };

  return (
    <div className="min-h-screen bg-black text-[#FAFAFA] flex flex-col font-sans selection:bg-[#333333] selection:text-white">
      {/* Navbar with 3 Tabs */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'verify' && (
          <VerifyPage onNavigateToAi={handleNavigateToAi} />
        )}

        {activeTab === 'ai' && (
          <AiExpertPage
            initialQuestion={initialAiQuestion}
            onClearInitialQuestion={() => setInitialAiQuestion('')}
          />
        )}

        {activeTab === 'producer' && (
          <ProducerPage />
        )}
      </main>

      {/* Ultra-minimalist Footer */}
      <footer className="border-t border-[#1F1F1F] bg-[#050505] py-8 text-xs text-[#525252]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <AslBrandMark className="h-4 w-4 text-[#888888]" strokeWidth={1.75} />
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
