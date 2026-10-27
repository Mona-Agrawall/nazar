import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Check, X } from 'lucide-react';
import { Stock } from '../types';
import { api } from '../services/api';

const SEARCH_DEBOUNCE_MS = 200;

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (symbol: string) => void;
  watchlistSymbols: string[];
  onToggleWatchlistStock: (symbol: string) => void;
}

export const CommandSearch: React.FC<CommandSearchProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  watchlistSymbols,
  onToggleWatchlistStock,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stock[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search: only the most recent request may update the results.
  useEffect(() => {
    if (!isOpen) return;
    const requestId = ++latestRequestRef.current;
    const timer = setTimeout(
      () => {
        api.searchStocks(query).then(
          (res) => {
            if (requestId === latestRequestRef.current) setResults(res);
          },
          (err) => {
            if (requestId !== latestRequestRef.current) return;
            console.error('[Nazar] Search failed', err);
            setResults([]);
          },
        );
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K is handled by App, which toggles this dialog.
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelectStock(results[selectedIndex].symbol);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectStock]);

  const handleSearch = (val: string) => {
    setQuery(val);
    setSelectedIndex(0);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[var(--color-ink)]/10 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-xl rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-soft)] bg-[var(--color-background)]">
            <Search className="w-4 h-4 text-[var(--color-faint)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search ticker, company name, or sector..."
              className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder-[var(--color-faint)] focus:outline-none font-normal"
            />
            {query && (
              <button
                onClick={() => handleSearch('')}
                className="p-1 rounded text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-[var(--color-muted)] bg-[var(--color-panel)] rounded border border-[var(--color-border-soft)]">
              ESC
            </kbd>
          </div>

          {/* Quick Tag Recommendations */}
          <div className="px-5 py-2.5 border-b border-[var(--color-border-soft)] bg-[var(--color-panel)] flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-[var(--color-faint)] font-mono text-[10px] uppercase ">Filter:</span>
            {['All', 'Tata', 'Banking', 'Tech', 'Energy', 'EV'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleSearch(tag === 'All' ? '' : tag)}
                className="px-2.5 py-0.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors text-[10px] font-mono uppercase"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {results.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-muted)] font-normal">
                No matching symbols found for "{query}"
              </div>
            ) : (
              results.map((stock, i) => {
                const isSelected = i === selectedIndex;
                const inWatchlist = watchlistSymbols.includes(stock.symbol);
                const isPos = stock.changePercent24h >= 0;

                return (
                  <div
                    key={stock.symbol}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => {
                      onSelectStock(stock.symbol);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-panel)] text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-border-soft)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] shadow-sm flex items-center justify-center font-mono text-xs font-medium text-[var(--color-ink)]">
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-sm text-[var(--color-ink)]">{stock.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)] font-mono">
                            {stock.exchange}
                          </span>
                          {stock.attentionScore >= 75 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-green-soft)] text-[var(--color-green)] font-mono font-medium">
                              Attention {stock.attentionScore}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-muted)] truncate max-w-xs font-normal">{stock.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-mono text-sm font-medium text-[var(--color-ink)] block">
                          ₹{stock.currentPrice.toFixed(2)}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-medium ${
                            isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                          }`}
                        >
                          {isPos ? '+' : ''}
                          {stock.changePercent24h.toFixed(2)}%
                        </span>
                      </div>

                      {/* Quick Add/Remove from Watchlist */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlistStock(stock.symbol);
                        }}
                        className={`p-1.5 rounded-full border transition-colors ${
                          inWatchlist
                            ? 'bg-[var(--color-green-soft)] border-[var(--color-green)]/30 text-[var(--color-green)]'
                            : 'bg-[var(--color-panel)] border-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-border-soft)]'
                        }`}
                        title={inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                      >
                        {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="p-3 bg-[var(--color-panel)] border-t border-[var(--color-border-soft)] flex items-center justify-between text-[11px] text-[var(--color-faint)] font-mono">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>ESC Close</span>
            </div>
            <span>{results.length} securities indexed</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
