import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Plus, Trash2, FolderPlus, ArrowUpDown, Search, ChevronRight } from 'lucide-react';
import { Stock, Watchlist } from '../types';
import { AnimatedPrice } from './AnimatedPrice';
import { currencySymbol, formatPrice } from '../lib/currency';

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
          <h2 className="text-2xl font-medium text-[var(--color-ink)]">{activeWl?.name || 'Watchlist'}</h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {stocks.length} {stocks.length === 1 ? 'stock' : 'stocks'} · ranked by attention score
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
                aria-pressed={isSelected}
                className={`h-8 px-3.5 rounded-full text-sm whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'border-[var(--color-green)] bg-[var(--color-green-soft)] text-[var(--color-green)] font-medium'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {wl.name}
              </button>
            );
          })}

          <button
            onClick={onOpenCreateWatchlist}
            title="Create new watchlist"
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-full text-sm font-medium text-[var(--color-green)] border border-dashed border-[var(--color-green)] hover:bg-[var(--color-green-soft)] transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New list</span>
          </button>
        </div>
      </div>

      {/* Control Toolbar: In-watchlist filter & sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Search within watchlist */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-faint)]" aria-hidden />
          <input
            type="text"
            placeholder="Search in this watchlist"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-md bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-[var(--color-ink)] placeholder-[var(--color-faint)] focus:outline-none focus:border-[var(--color-green)]"
            aria-label="Filter stocks in watchlist"
          />
        </div>

        {/* Sorting options */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-[var(--color-muted)] flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4" /> Sort by
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
              aria-pressed={sortBy === s.id}
              className={`h-8 px-3 rounded-full border transition-colors text-sm ${
                sortBy === s.id
                  ? 'border-[var(--color-green)] bg-[var(--color-green-soft)] text-[var(--color-green)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {s.label}
            </button>
          ))}

          <button
            onClick={onOpenSearch}
            className="ml-auto sm:ml-2 flex items-center gap-1.5 h-10 px-4 rounded-md bg-[var(--color-green)] hover:bg-[var(--color-green-hover)] text-white font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add stock</span>
          </button>
        </div>
      </div>

      {/* Stock Ledger Container */}
      {sortedStocks.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 text-center rounded-lg border border-[var(--color-border)]">
          <div className="w-12 h-12 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-muted)] flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-[var(--color-ink)]">Your watchlist is empty</h3>
          <p className="text-sm text-[var(--color-muted)] mt-1.5 max-w-xs mx-auto leading-relaxed font-normal">
            Add a few stocks to begin tracking what meaningfully changed.
          </p>

          {suggestedToAdd.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--color-border-soft)]">
              <p className="text-sm text-[var(--color-muted)] mb-3">Suggested stocks</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {suggestedToAdd.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => onAddStock(s.symbol)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-background)] hover:bg-[var(--color-panel)] border border-[var(--color-border)] text-sm text-[var(--color-ink)] transition-colors"
                  >
                    <Plus className="w-3 h-3 text-[var(--color-green)]" />
                    <span>{s.symbol}</span>
                    <span className="text-[var(--color-faint)] font-mono text-xs">
                      {currencySymbol(s.exchange)}
                      {formatPrice(s.currentPrice, 0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="premium-card rounded-lg overflow-hidden">
          {/* Editorial Ledger Header */}
          <div
            className="hidden md:grid grid-cols-12 bg-[var(--color-background)] px-5 py-3 text-xs uppercase tracking-wide text-[var(--color-muted)] font-medium border-b border-[var(--color-border)]"
            role="row"
          >
            <div className="col-span-5" role="columnheader">
              Company
            </div>
            <div className="col-span-3" role="columnheader">
              Since last visit
            </div>
            <div className="col-span-2 text-right" role="columnheader">
              Market price
            </div>
            <div className="col-span-2 text-right pr-12" role="columnheader">
              Attention
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border)]" role="list">
            <AnimatePresence mode="popLayout">
              {sortedStocks.map((stock, idx) => {
                const isPos = stock.userDelta.percentDiff >= 0;
                const hasSurge = stock.volumeRatio >= 1.5;
                const isHighAttention = stock.attentionScore >= 75;

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
                    className="group relative flex flex-col md:grid md:grid-cols-12 md:items-center px-4 py-4 sm:px-5 md:min-h-[76px] hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
                  >
                    {/* Left: Symbol, Name, Sector */}
                    <div className="md:col-span-5 flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-ink)] text-[15px]">{stock.name}</span>
                          {hasSurge && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-green-soft)] text-[var(--color-green)] font-mono font-medium">
                              {stock.volumeRatio}× Vol
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-muted)] truncate max-w-[320px] font-normal mt-0.5">
                          {stock.symbol} · {stock.exchange} · {stock.scoreFactors[0]?.label || stock.sector}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Delta since check */}
                    <div className="my-2 md:my-0 md:col-span-3">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-sm font-mono font-medium ${
                            isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {stock.userDelta.percentDiff.toFixed(2)}%
                        </span>
                        <span className="text-xs font-mono text-[var(--color-muted)]">
                          ({currencySymbol(stock.exchange)}
                          {formatPrice(stock.userDelta.previousPrice)})
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-soft)] line-clamp-1 font-normal">
                        {stock.userDelta.narrative}
                      </p>
                    </div>

                    {/* Price & Sparkline */}
                    <div className="md:col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center my-1 md:my-0">
                      <div className="font-mono text-[15px] font-medium text-[var(--color-ink)]">
                        <AnimatedPrice value={stock.currentPrice} currency={currencySymbol(stock.exchange)} />
                      </div>
                      <div
                        className={`text-xs font-mono flex items-center gap-0.5 ${
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
                        className="flex items-center justify-center min-w-[44px] h-7 px-2 rounded-md border border-[var(--color-border)] hover:border-[#dddee1] bg-[var(--color-background)] transition-colors"
                      >
                        <span
                          className={`text-sm font-mono font-medium ${
                            isHighAttention
                              ? 'text-[var(--color-green)]'
                              : stock.attentionScore >= 50
                                ? 'text-[var(--color-amber)]'
                                : 'text-[var(--color-muted)]'
                          }`}
                        >
                          {stock.attentionScore}
                        </span>
                      </button>

                      {/* Quick remove */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveStock(stock.symbol);
                        }}
                        title="Remove from watchlist"
                        aria-label={`Remove ${stock.symbol} from watchlist`}
                        // Always visible on touch screens; on hover devices shown on row hover or keyboard focus
                        className="opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 p-1.5 rounded-lg text-[var(--color-faint)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-soft)] transition-all"
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
