import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppTab, Stock, MarketIndex, MarketEvent, Watchlist, MarketPulse, FeedStatus } from './types';
import { api } from './services/api';
import { AtmosphereField } from './components/AtmosphereField';
import { FirstOpenExperience } from './components/FirstOpenExperience';
import { Header } from './components/Header';
import { MarketIndicesBar } from './components/MarketIndicesBar';
import { MarketPulseHero } from './components/MarketPulseHero';
import { IntelligentWatchlist } from './components/IntelligentWatchlist';
import { ChangeTimeline } from './components/ChangeTimeline';
import { StockDetailModal } from './components/StockDetailModal';
import { AttentionWhyModal } from './components/AttentionWhyModal';
import { CommandSearch } from './components/CommandSearch';
import { TimeTravelModal } from './components/TimeTravelModal';
import { CreateWatchlistModal } from './components/CreateWatchlistModal';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Each browser tab starts from the canonical "7h 42m away" demo scenario once.
const DEMO_INITIALIZED_KEY = 'nazar_demo_initialized';
const INTRO_SEEN_KEY = 'nazar_intro_seen';
const REFRESH_INTERVAL_MS = 15_000;

function Dashboard() {
  const [showFirstOpen, setShowFirstOpen] = useState<boolean>(() => localStorage.getItem(INTRO_SEEN_KEY) !== 'true');

  // App core state
  const [activeTab, setActiveTab] = useState<AppTab>('pulse');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [allAvailableStocks, setAllAvailableStocks] = useState<Stock[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('wl_default');
  const [pulse, setPulse] = useState<MarketPulse | null>(null);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [feedStatus, setFeedStatus] = useState<FeedStatus | null>(null);

  // UI state
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);
  const [whyModalStock, setWhyModalStock] = useState<Stock | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTimeTravelOpen, setIsTimeTravelOpen] = useState(false);
  const [isCreateWatchlistOpen, setIsCreateWatchlistOpen] = useState(false);
  const [filterOnlyImportant, setFilterOnlyImportant] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Load market data ──────────────────────────────────────────────────────
  const loadMarketData = useCallback(async (watchlistId?: string) => {
    try {
      const [wlData, idxData, statusData] = await Promise.all([
        api.getWatchlists(),
        api.getIndices(),
        api.getFeedStatus(),
      ]);

      setWatchlists(wlData.watchlists);
      setIndices(idxData);
      setFeedStatus(statusData);

      const targetWlId = watchlistId || wlData.activeId || wlData.watchlists[0]?.id;
      setActiveWatchlistId(targetWlId);

      const [stockData, allData, pulseData, eventData] = await Promise.all([
        api.getStocks(targetWlId),
        api.getAllStocks(),
        api.getPulse(targetWlId),
        api.getEvents(targetWlId),
      ]);

      setStocks(stockData.stocks);
      setAllAvailableStocks(allData);
      setPulse(pulseData);
      setEvents(eventData);
    } catch (err) {
      console.error('[Nazar] Failed to load market data', err);
    }
  }, []);

  // ── Initial load (seeds the demo scenario on a tab's first visit) ────────
  useEffect(() => {
    if (sessionStorage.getItem(DEMO_INITIALIZED_KEY)) {
      loadMarketData();
      return;
    }
    api.resetDemo().then(() => {
      sessionStorage.setItem(DEMO_INITIALIZED_KEY, 'true');
      loadMarketData();
    });
  }, [loadMarketData]);

  // ── Polling refresh ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => loadMarketData(activeWatchlistId), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadMarketData, activeWatchlistId]);

  // ── Cmd/Ctrl+K opens search ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Intro ─────────────────────────────────────────────────────────────────
  const handleCompleteIntro = () => {
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    setShowFirstOpen(false);
  };

  // ── Watchlist ─────────────────────────────────────────────────────────────
  const handleSelectWatchlist = async (id: string) => {
    setActiveWatchlistId(id);
    const [stockData, pulseData, eventData] = await Promise.all([
      api.getStocks(id),
      api.getPulse(id),
      api.getEvents(id),
    ]);
    setStocks(stockData.stocks);
    setPulse(pulseData);
    setEvents(eventData);
  };

  const handleRemoveStock = async (symbol: string) => {
    const wl = watchlists.find((w) => w.id === activeWatchlistId);
    if (!wl) return;
    // Optimistic update
    setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
    await api.updateWatchlist(wl.id, { symbols: wl.symbols.filter((s) => s !== symbol) });
  };

  const handleAddStock = async (symbol: string) => {
    const wl = watchlists.find((w) => w.id === activeWatchlistId);
    if (!wl || wl.symbols.includes(symbol)) return;
    await api.updateWatchlist(wl.id, { symbols: [...wl.symbols, symbol] });
    await loadMarketData(activeWatchlistId);
  };

  const handleToggleWatchlistStock = (symbol: string) => {
    const wl = watchlists.find((w) => w.id === activeWatchlistId);
    wl?.symbols.includes(symbol) ? handleRemoveStock(symbol) : handleAddStock(symbol);
  };

  const handleCreateWatchlist = async (name: string, symbols: string[]) => {
    const newWl = await api.createWatchlist(name, symbols);
    setWatchlists((prev) => [...prev, newWl]);
    await handleSelectWatchlist(newWl.id);
  };

  // ── Events ────────────────────────────────────────────────────────────────
  const handleAcknowledgeEvent = async (id: string) => {
    await api.acknowledgeEvent(id);
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, acknowledged: true } : e)));
  };

  const handleDismissEvent = async (id: string) => {
    await api.dismissEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Time Travel ───────────────────────────────────────────────────────────
  const handleTimeTravel = async (preset: string) => {
    await api.timeTravel(preset);
    await loadMarketData(activeWatchlistId);
  };

  // ── Session sync ──────────────────────────────────────────────────────────
  const handleSyncSession = async () => {
    setIsSyncing(true);
    try {
      await api.syncSession();
      await loadMarketData(activeWatchlistId);
    } finally {
      setIsSyncing(false);
    }
  };

  // Shown on both the Nazar and Watchlist tabs.
  const watchlistPanel = (
    <IntelligentWatchlist
      stocks={stocks}
      watchlists={watchlists}
      activeWatchlistId={activeWatchlistId}
      onSelectWatchlist={handleSelectWatchlist}
      onSelectStock={setSelectedStockSymbol}
      onOpenWhyModal={setWhyModalStock}
      onOpenCreateWatchlist={() => setIsCreateWatchlistOpen(true)}
      onOpenSearch={() => setIsSearchOpen(true)}
      onRemoveStock={handleRemoveStock}
      allAvailableStocks={allAvailableStocks}
      onAddStock={handleAddStock}
    />
  );

  return (
    <div
      className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-ink)] flex flex-col font-sans selection:bg-[var(--color-green-soft)] selection:text-[var(--color-green)]"
      role="main"
    >
      {/* Background depth particles */}
      <AtmosphereField />

      {/* Cinematic intro */}
      <AnimatePresence>{showFirstOpen && <FirstOpenExperience onComplete={handleCompleteIntro} />}</AnimatePresence>

      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        feedStatus={feedStatus}
        awayFormatted={pulse?.awayDurationFormatted || '7h 42m'}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenTimeTravel={() => setIsTimeTravelOpen(true)}
        onReplayIntro={() => setShowFirstOpen(true)}
        onSyncNow={handleSyncSession}
        isSyncing={isSyncing}
      />

      {/* Market indices ticker */}
      <MarketIndicesBar indices={indices} />

      {/* Main content */}
      <main className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'pulse' && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MarketPulseHero
                pulse={pulse}
                stocks={stocks}
                events={events}
                onSelectStock={setSelectedStockSymbol}
                onAcknowledgeEvent={handleAcknowledgeEvent}
                onOpenTimeTravel={() => setIsTimeTravelOpen(true)}
                filterOnlyImportant={filterOnlyImportant}
                onToggleFilterImportant={setFilterOnlyImportant}
                onOpenWhyModal={setWhyModalStock}
              />

              <section className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
                {watchlistPanel}
              </section>
            </motion.div>
          )}

          {activeTab === 'watchlist' && (
            <motion.div
              key="watchlist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-4"
            >
              {watchlistPanel}
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChangeTimeline
                events={events}
                onSelectStock={setSelectedStockSymbol}
                onAcknowledgeEvent={handleAcknowledgeEvent}
                onDismissEvent={handleDismissEvent}
              />
            </motion.div>
          )}

          {activeTab === 'indices' && (
            <motion.div
              key="indices"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto px-4 sm:px-6 py-8"
            >
              <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--color-faint)] mb-2 font-medium">
                Macro Overview
              </div>
              <h2 className="text-3xl sm:text-4xl font-normal text-[var(--color-ink)] mb-2">Market Benchmarks</h2>
              <p className="text-xs text-[var(--color-muted)] mb-8 font-normal">
                Core macro indices providing broad liquidity, directional bias, and valuation framing.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {indices.map((idx) => (
                  <div
                    key={idx.symbol}
                    className="p-6 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] hover:border-[var(--color-border)] transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase text-[var(--color-faint)] font-mono">{idx.symbol}</span>
                        <h3 className="text-xl font-normal text-[var(--color-ink)] mt-0.5">{idx.name}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-mono font-normal text-[var(--color-ink)] block tabular-nums">
                          {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span
                          className={`text-xs font-mono font-medium ${idx.change >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
                        >
                          {idx.change >= 0 ? '+' : ''}
                          {idx.change.toFixed(2)} ({idx.change >= 0 ? '+' : ''}
                          {idx.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-[var(--color-border-soft)] flex items-center justify-between text-[11px] text-[var(--color-muted)] font-mono">
                      <span>Low: {idx.low.toLocaleString('en-IN')}</span>
                      <span>High: {idx.high.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--color-border)] bg-[var(--color-background)] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted)]">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[var(--color-ink-soft)] font-medium text-xs">NAZAR 2026</span>
            <span className="text-[var(--color-border)]">|</span>
            <span className="font-normal text-[var(--color-muted)] text-[11px]">
              Intelligent Market Attention · Meaningful Change Engine
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] uppercase font-mono">
            <span>Deterministic Mock Feed</span>
            <span className="text-[var(--color-border)]">·</span>
            <span>NSE / BSE Delayed</span>
            <span className="text-[var(--color-border)]">·</span>
            <button
              onClick={() => setIsTimeTravelOpen(true)}
              className="text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors underline decoration-[var(--color-border-soft)]"
            >
              Simulate Absence
            </button>
          </div>
        </div>
      </footer>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedStockSymbol && (
          <StockDetailModal
            symbol={selectedStockSymbol}
            onClose={() => setSelectedStockSymbol(null)}
            onOpenWhyModal={() => {
              const s = stocks.find((st) => st.symbol === selectedStockSymbol);
              if (s) setWhyModalStock(s);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {whyModalStock && (
          <AttentionWhyModal
            stock={whyModalStock}
            onClose={() => setWhyModalStock(null)}
            onOpenDetail={(sym) => {
              setWhyModalStock(null);
              setSelectedStockSymbol(sym);
            }}
          />
        )}
      </AnimatePresence>

      <CommandSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStock={setSelectedStockSymbol}
        watchlistSymbols={stocks.map((s) => s.symbol)}
        onToggleWatchlistStock={handleToggleWatchlistStock}
      />

      <TimeTravelModal
        isOpen={isTimeTravelOpen}
        onClose={() => setIsTimeTravelOpen(false)}
        onSelectPreset={handleTimeTravel}
        currentAwayFormatted={pulse?.awayDurationFormatted || '7h 42m'}
      />

      <CreateWatchlistModal
        isOpen={isCreateWatchlistOpen}
        onClose={() => setIsCreateWatchlistOpen(false)}
        onCreate={handleCreateWatchlist}
        availableStocks={allAvailableStocks}
      />
    </div>
  );
}

function AuthGate() {
  const { user, isLoading, isDemoMode } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--color-green)] animate-spin" />
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
