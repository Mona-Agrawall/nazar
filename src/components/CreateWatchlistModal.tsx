import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FolderPlus, Check } from 'lucide-react';
import { Stock } from '../types';
import { currencySymbol } from '../lib/currency';
import { useEscapeKey } from '../lib/useEscapeKey';

const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS'];
const MAX_NAME_LENGTH = 50; // matches the server limit

interface CreateWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, symbols: string[]) => Promise<void>;
  availableStocks: Stock[];
}

export const CreateWatchlistModal: React.FC<CreateWatchlistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  availableStocks,
}) => {
  const [name, setName] = useState('');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  useEscapeKey(handleClose, isOpen);

  if (!isOpen) return null;

  const toggleSymbol = (sym: string) => {
    setSelectedSymbols((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(name.trim(), selectedSymbols);
      setName('');
      setSelectedSymbols(DEFAULT_SYMBOLS);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the watchlist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-ink)]/10 backdrop-blur-md"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] shadow-2xl p-6 text-[var(--color-ink)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border-soft)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-panel)] text-[var(--color-muted)] border border-[var(--color-border-soft)]">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-normal ">Create Ledger</h3>
                <p className="text-xs text-[var(--color-faint)] font-normal">
                  Segment assets by theme, mandate, or asset class
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              aria-label="Close"
              className="p-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[var(--color-red-soft)] text-xs text-[var(--color-red)] font-normal"
              >
                {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-medium text-[var(--color-faint)] mb-1.5 font-mono uppercase ">
                Ledger Title
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder="e.g. Sovereign Bluechips, EV Supply Chain..."
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border)] text-sm text-[var(--color-ink)] placeholder-[var(--color-faint)] focus:outline-none focus:border-[var(--color-muted)] font-normal"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[var(--color-faint)] mb-1.5 font-mono uppercase ">
                Initial Assets ({selectedSymbols.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto p-1.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] space-y-1">
                {availableStocks.map((stock) => {
                  const isChecked = selectedSymbols.includes(stock.symbol);
                  return (
                    <button
                      type="button"
                      key={stock.symbol}
                      onClick={() => toggleSymbol(stock.symbol)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors ${
                        isChecked
                          ? 'bg-[var(--color-background)] text-[var(--color-ink)] border border-[var(--color-border)] shadow-sm'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-border-soft)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{stock.symbol}</span>
                        <span className="text-[11px] text-[var(--color-faint)] truncate max-w-[150px] font-normal">
                          {stock.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[var(--color-faint)] text-[10px]">
                          {currencySymbol(stock.exchange)}
                          {stock.currentPrice.toFixed(0)}
                        </span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-[var(--color-green)]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-border-soft)] flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-xs font-medium text-[var(--color-muted)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="px-5 py-2 rounded-full bg-[var(--color-ink)] hover:bg-[var(--color-ink-soft)] text-[var(--color-background)] font-semibold text-xs transition-colors disabled:opacity-40"
              >
                {submitting ? 'Creating...' : 'Initialize Watchlist'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
