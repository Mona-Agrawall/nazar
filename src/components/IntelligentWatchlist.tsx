import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Plus, Trash2, FolderPlus, ArrowUpDown, Search, ChevronRight } from 'lucide-react';
import { Stock, Watchlist } from '../types';
import { AnimatedPrice } from './AnimatedPrice';
import { currencySymbol } from '../lib/currency';

interface IntelligentWatchlistProps {
  stocks: Stock[];
  watchlists: Watchlist[];
  activeWatchlistId: string;
  onSelectWatchlist: (id: string) => void;
  onSelectStock: (symbol: string) => void;
  onOpenWhyModal: (stock: Stock) => void;
  onOpenCreateWatchlist: () => void;
  onOpenSearch: () => void;
  onRemoveStock: (symbol: string) => void;
  allAvailableStocks: Stock[];
  onAddStock: (symbol: string) => void;
}

export const IntelligentWatchlist: React.FC<IntelligentWatchlistProps> = ({
  stocks,
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  onSelectStock,
  onOpenWhyModal,
  onOpenCreateWatchlist,
  onOpenSearch,
  onRemoveStock,
  allAvailableStocks,
  onAddStock,
}) => {
  const [sortBy, setSortBy] = useState<'attention' | 'change' | 'volume' | 'symbol'>('attention');
  const [searchFilter, setSearchFilter] = useState('');

  // Sorting
  const sortedStocks = [...stocks]
    .filter((s) => {
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'attention') return b.attentionScore - a.attentionScore;
      if (sortBy === 'change') return Math.abs(b.changePercent24h) - Math.abs(a.changePercent24h);
      if (sortBy === 'volume') return b.volumeRatio - a.volumeRatio;
      return a.symbol.localeCompare(b.symbol);
    });

  // Current active watchlist
  const activeWl = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  // Candidates for quick adding when watchlist is small or empty
  const suggestedToAdd = allAvailableStocks
    .filter((s) => !stocks.some((existing) => existing.symbol === s.symbol))
    .slice(0, 4);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Watchlist Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-normal text-[var(--color-ink)] ">
              {activeWl?.name || 'Watchlist'}
            </h2>
            <span className="text-[10px] uppercase px-2.5 py-0.5 rounded-full bg-[var(--color-panel)] text-[var(--color-muted)] font-mono border border-[var(--color-border-soft)]">
              {stocks.length} Assets
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-faint)] font-medium mt-1">
            Ranked by Attention Score · Anomaly & Breakout Detection
          </p>
        </div>

        {/* Watchlist Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {watchlists.map((wl) => {
            const isSelected = wl.id === activeWatchlistId;
            return (
              <button
                key={wl.id}
                onClick={() => onSelectWatchlist(wl.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] uppercase font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[var(--color-background)] text-[var(--color-ink)] border-[var(--color-border)] shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] bg-[var(--color-panel)] border-[var(--color-border-soft)] hover:bg-[var(--color-border-soft)]'
                }`}
              >
                {wl.name}
              </button>
            );
          })}

          <button
            onClick={onOpenCreateWatchlist}
            title="Create new watchlist"
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] uppercase font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border-soft)] transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New List</span>
          </button>
        </div>
      </div>

      {/* Control Toolbar: In-watchlist filter & sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 p-3 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)]">
        {/* Search within watchlist */}
        <div className="relative flex-1 max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-faint)]"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Filter ledger..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] placeholder-[var(--color-faint)] focus:outline-none focus:border-[var(--color-muted)]"
            aria-label="Filter stocks in watchlist"
          />
        </div>

        {/* Sorting options */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-[var(--color-faint)] flex items-center gap-1 font-mono text-[10px] uppercase ">
            <ArrowUpDown className="w-3 h-3" /> Sort:
          </span>
          {(
            [
              { id: 'attention', label: 'Attention' },
              { id: 'change', label: '% Move' },
              { id: 'volume', label: 'Volume' },
              { id: 'symbol', label: 'Symbol' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              className={`px-3 py-1 rounded-full transition-colors text-[10px] uppercase font-medium ${
                sortBy === s.id
                  ? 'bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-ink)] shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {s.label}
            </button>
          ))}

          <button
            onClick={onOpenSearch}
            className="ml-auto sm:ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-background)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border)] text-[var(--color-ink)] font-medium text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--color-green)]" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Stock Ledger Container */}
      {sortedStocks.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 text-center rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-muted)] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-normal text-[var(--color-ink)] ">Your market starts here</h3>
          <p className="text-xs text-[var(--color-muted)] mt-1.5 max-w-xs mx-auto leading-relaxed font-normal">
            Add a few stocks to begin tracking what meaningfully changed.
          </p>

          {suggestedToAdd.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--color-border-soft)]">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-faint)] font-medium mb-3">
                Suggested Bluechips
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {suggestedToAdd.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => onAddStock(s.symbol)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-background)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] transition-colors shadow-sm"
                  >
                    <Plus className="w-3 h-3 text-[var(--color-green)]" />
                    <span>{s.symbol}</span>
                    <span className="text-[var(--color-faint)] font-mono text-[10px]">
                      {currencySymbol(s.exchange)}
                      {s.currentPrice.toFixed(0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="premium-card rounded-2xl overflow-hidden">
          {/* Editorial Ledger Header */}
          <div
            className="hidden md:grid grid-cols-12 bg-[var(--color-panel)] px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-[var(--color-muted)] font-medium border-b border-[var(--color-border-soft)]"
            role="row"
          >
            <div className="col-span-5" role="columnheader">
              Asset &amp; Meaningful Narrative
            </div>
            <div className="col-span-3" role="columnheader">
              Since Last Checked
            </div>
            <div className="col-span-2 text-right" role="columnheader">
              Price / Trend
            </div>
            <div className="col-span-2 text-right" role="columnheader">
              Nazar Score
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border-soft)]" role="list">
            <AnimatePresence mode="popLayout">
              {sortedStocks.map((stock, idx) => {
                const isPos = stock.userDelta.percentDiff >= 0;
                const hasSurge = stock.volumeRatio >= 1.5;
                const isHighAttention = stock.attentionScore >= 75;
                const levelClass =
                  stock.attentionLevel === 'high'
                    ? 'attention-high'
                    : stock.attentionLevel === 'medium'
                      ? 'attention-medium'
                      : 'attention-low';

                return (
                  <motion.div
                    key={stock.symbol}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.22 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                    onClick={() => onSelectStock(stock.symbol)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectStock(stock.symbol);
                      }
                    }}
                    tabIndex={0}
                    role="listitem"
                    aria-label={`${stock.symbol}: ${isPos ? '+' : ''}${stock.userDelta.percentDiff.toFixed(2)}% since last visit. Attention score ${stock.attentionScore}.`}
                    className={`group relative flex flex-col md:grid md:grid-cols-12 md:items-center p-4 sm:px-5 hover:bg-[var(--color-panel)] transition-colors cursor-pointer ${levelClass}`}
                  >
                    {/* Left: Symbol, Name, Sector */}
                    <div className="md:col-span-5 flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-[var(--color-ink)] text-sm transition-colors">
                            {stock.symbol}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)] font-mono">
                            {stock.exchange}
                          </span>
                          {hasSurge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-green-soft)] text-[var(--color-green)] font-mono font-medium">
                              {stock.volumeRatio}× Vol
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--color-muted)] truncate max-w-[280px] font-normal mt-0.5">
                          {stock.name} · {stock.scoreFactors[0]?.label || stock.sector}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Delta since check */}
                    <div className="my-2 md:my-0 md:col-span-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase text-[var(--color-faint)]">Delta:</span>
                        <span
                          className={`text-xs font-mono font-medium ${
                            isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {stock.userDelta.percentDiff.toFixed(2)}%
                        </span>
                        <span className="text-[11px] font-mono text-[var(--color-muted)]">
                          ({currencySymbol(stock.exchange)}
                          {stock.userDelta.previousPrice.toFixed(1)})
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-soft)] line-clamp-1 font-normal">
                        {stock.userDelta.narrative}
                      </p>
                    </div>

                    {/* Price & Sparkline */}
                    <div className="md:col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center my-1 md:my-0">
                      <div className="font-mono text-sm font-medium text-[var(--color-ink)]">
                        <AnimatedPrice value={stock.currentPrice} currency={currencySymbol(stock.exchange)} />
                      </div>
                      <div
                        className={`text-[11px] font-mono flex items-center gap-0.5 ${
                          stock.changePercent24h >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                        }`}
                      >
                        {stock.changePercent24h >= 0 ? '+' : ''}
                        {stock.changePercent24h.toFixed(2)}%
                      </div>
                    </div>

                    {/* Attention Score & Action */}
                    <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2 md:mt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenWhyModal(stock);
                        }}
                        aria-label={`Why does ${stock.symbol} deserve attention? Score: ${stock.attentionScore}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border-soft)] transition-colors"
                      >
                        <span
                          className={`text-xs font-mono font-medium ${
                            isHighAttention
                              ? 'text-[var(--color-green)]'
                              : stock.attentionScore >= 50
                                ? 'text-[var(--color-amber)]'
                                : 'text-[var(--color-muted)]'
                          }`}
                        >
                          {stock.attentionScore}
                        </span>
                        <span className="text-[9px] uppercase text-[var(--color-faint)]">Nazar</span>
                      </button>

                      {/* Quick remove */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveStock(stock.symbol);
                        }}
                        title="Remove from watchlist"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--color-faint)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-soft)] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <ChevronRight className="w-3.5 h-3.5 text-[var(--color-faint)] group-hover:text-[var(--color-muted)] transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
