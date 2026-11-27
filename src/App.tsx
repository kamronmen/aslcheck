import { lazy, Suspense, useEffect, useState } from 'react';
import { RefreshCw, Presentation, ArrowUpRight } from 'lucide-react';
import { Navbar, PRESENTATION_URL, type NavTab } from './components/Navbar';
import { VerifyPage } from './components/VerifyPage';
import { AslBrandMark } from './components/Icons';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const AiExpertPage = lazy(() =>
  import('./components/AiExpertPage').then((m) => ({ default: m.AiExpertPage }))
);
const ProducerPage = lazy(() =>
  import('./components/ProducerPage').then((m) => ({ default: m.ProducerPage }))
);

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

const TabLoadingFallback = () => (
  <div className="flex h-80 flex-col items-center justify-center space-y-3">
    <RefreshCw className="h-5 w-5 animate-spin text-[#888888]" strokeWidth={1.75} />
    <span className="text-xs text-[#888888]">Bo‘lim yuklanmoqda...</span>
  </div>
);

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
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'verify' && (
          <VerifyPage onNavigateToAi={handleNavigateToAi} />
        )}

        <Suspense fallback={<TabLoadingFallback />}>
          {activeTab === 'ai' && (
            <AiExpertPage
              initialQuestion={initialAiQuestion}
              onClearInitialQuestion={() => setInitialAiQuestion('')}
            />
          )}

          {activeTab === 'producer' && <ProducerPage />}
        </Suspense>
      </main>

      {/* Floating Edge Presentation Button (hidden during AI chat & printing) */}
      {activeTab !== 'ai' && (
        <a
          href={PRESENTATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="AslCheck taqdimotini ochish"
          className="no-print fixed bottom-4 right-4 z-30 inline-flex items-center space-x-1.5 rounded-full border border-white/15 border-t-white/25 bg-[#0C0C0C]/90 px-3.5 py-2 text-xs font-medium text-[#FAFAFA] shadow-[0_10px_32px_rgba(0,0,0,0.85)] backdrop-blur-md hover:border-white/35 hover:bg-[#171717] transition-all"
        >
          <Presentation className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.75} />
          <span>Taqdimot</span>
          <ArrowUpRight className="h-3 w-3 text-[#888888]" strokeWidth={1.75} />
        </a>
      )}

      <footer className="border-t border-[#1F1F1F] bg-[#050505] py-8 text-xs text-[#525252]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <AslBrandMark className="h-4 w-4 text-[#888888]" strokeWidth={1.75} />
            <span className="font-semibold text-[#888888]">AslCheck</span>
            <span>—</span>
            <span>Milliy mahsulotlar haqiqiyligi reyestri</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-[#525252]">
            <a
              href={PRESENTATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[#888888] hover:text-[#FAFAFA] transition-colors"
            >
              <Presentation className="h-3 w-3 text-[#10B981]" strokeWidth={1.75} />
              <span>Taqdimot</span>
              <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} />
            </a>
            <span>•</span>
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
