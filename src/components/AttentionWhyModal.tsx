import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  HelpCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { Stock, AttentionFactor } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../lib/currency';

interface AttentionWhyModalProps {
  stock: Stock | null;
  onClose: () => void;
  onOpenDetail?: (symbol: string) => void;
}

function getFactorIcon(type: AttentionFactor['type']) {
  switch (type) {
    case 'volume':
      return <BarChart3 className="w-4 h-4 text-[var(--color-green)]" aria-hidden />;
    case 'breakout':
      return <TrendingUp className="w-4 h-4 text-[var(--color-ink)]" aria-hidden />;
    case 'volatility':
      return <Zap className="w-4 h-4 text-[var(--color-amber)]" aria-hidden />;
    case 'gap':
      return <ShieldAlert className="w-4 h-4 text-[var(--color-red)]" aria-hidden />;
    case 'price':
      return <TrendingDown className="w-4 h-4 text-[var(--color-muted)]" aria-hidden />;
    default:
      return <Sparkles className="w-4 h-4 text-[var(--color-green)]" aria-hidden />;
  }
}

export const AttentionWhyModal: React.FC<AttentionWhyModalProps> = ({ stock, onClose, onOpenDetail }) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fetch the explanation whenever a different stock opens
  useEffect(() => {
    if (!stock) return;
    setExplanation(null);
    setIsExplanationLoading(true);
    api
      .getExplanation(stock)
      .then(setExplanation)
      .finally(() => setIsExplanationLoading(false));
  }, [stock?.symbol]);

  if (!stock) return null;

  const isPos = stock.userDelta.percentDiff >= 0;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-[var(--color-ink)]/10 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Why ${stock.symbol} deserves attention`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg rounded-2xl glass-panel shadow-[0_24px_64px_rgba(0,0,0,0.06)] text-[var(--color-ink)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="p-6 border-b border-[var(--color-border-soft)] flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-green-soft)] border border-[var(--color-green)]/20 text-[var(--color-green)]">
                <HelpCircle className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-normal ">Why {stock.symbol}?</h2>
                  <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-[var(--color-panel)] text-[var(--color-muted)] font-mono border border-[var(--color-border-soft)]">
                    Attention Score
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted)] font-normal mt-0.5">
                  Why this stock deserves your attention now
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* ── Why it matters ──────────────────────────────────────────── */}
            <div className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)]">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-green)]" aria-hidden />
                <span className="text-[10px] uppercase text-[var(--color-green)] font-medium">Why it matters</span>
              </div>
              {isExplanationLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <div
                    className="w-3 h-3 border border-[var(--color-green)] border-t-transparent rounded-full animate-spin"
                    aria-hidden
                  />
                  <span className="text-xs text-[var(--color-muted)] font-normal">Generating insight…</span>
                </div>
              ) : (
                <p className="prose-market" aria-live="polite">
                  {explanation || stock.userDelta.narrative}
                </p>
              )}
            </div>

            {/* ── Attention Score gauge ───────────────────────────────────── */}
            <div className="p-4 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border-soft)] shadow-[var(--shadow-premium)] flex items-center justify-between gap-4">
              <div>
                <div className="text-4xl font-mono font-normal text-[var(--color-ink)] flex items-baseline gap-1">
                  <span>{stock.attentionScore}</span>
                  <span className="text-xs font-normal text-[var(--color-faint)] uppercase ">/ 100</span>
                </div>
                <div
                  className={`text-xs font-medium mt-1 ${stock.attentionScore >= 80 ? 'text-[var(--color-green)]' : stock.attentionScore >= 60 ? 'text-[var(--color-amber)]' : 'text-[var(--color-muted)]'}`}
                >
                  {stock.attentionScore >= 80
                    ? 'Exceptional Activity'
                    : stock.attentionScore >= 60
                      ? 'Meaningful Shift'
                      : 'Moderate Change'}
                </div>
              </div>
              <div className="flex-1 max-w-[140px] space-y-1.5">
                <div
                  className="h-1.5 w-full bg-[var(--color-border)] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={stock.attentionScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Attention score: ${stock.attentionScore} out of 100`}
                >
                  <div
                    className={`h-full rounded-full score-fill ${stock.attentionScore >= 80 ? 'bg-[var(--color-green)]' : stock.attentionScore >= 60 ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-muted)]'}`}
                    style={{ width: `${stock.attentionScore}%` }}
                  />
                </div>
                <div className="text-[9px] text-[var(--color-faint)] text-right font-mono uppercase ">
                  Last check: {stock.userDelta.lastSeenTimeFormatted} ago
                </div>
              </div>
            </div>

            {/* ── Scoring factors ──────────────────────────────────────────── */}
            {stock.scoreFactors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-faint)] font-medium">
                  Scoring factors
                </h3>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1" role="list">
                  {stock.scoreFactors.map((f, i) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.2 }}
                      className="p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] hover:border-[var(--color-border)] transition-colors"
                      role="listitem"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {getFactorIcon(f.type)}
                          <span className="text-xs font-medium text-[var(--color-ink)]">{f.label}</span>
                        </div>
                        <span className="text-xs font-mono font-medium text-[var(--color-green)] shrink-0">
                          +{f.points} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-normal pl-6">
                        {f.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Delta comparison footer ──────────────────────────────────── */}
            <div className="pt-4 border-t border-[var(--color-border-soft)] flex items-center justify-between">
              <div className="text-[11px] text-[var(--color-muted)] font-normal">
                Last seen at {currencySymbol(stock.exchange)}
                {stock.userDelta.previousPrice.toFixed(2)} · Now {currencySymbol(stock.exchange)}
                {stock.currentPrice.toFixed(2)}
                <span
                  className={`ml-2 font-mono font-medium ${isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
                >
                  ({isPos ? '+' : ''}
                  {stock.userDelta.percentDiff.toFixed(2)}%)
                </span>
              </div>

              {onOpenDetail && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenDetail(stock.symbol);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border-soft)] text-[var(--color-ink)] text-xs font-medium transition-colors"
                  aria-label={`Open full analysis for ${stock.symbol}`}
                >
                  <span>Full analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
