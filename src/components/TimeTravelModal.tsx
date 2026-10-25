import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, Star } from 'lucide-react';

interface TimeTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: string) => Promise<void>;
  currentAwayFormatted: string;
}

export const TimeTravelModal: React.FC<TimeTravelModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  currentAwayFormatted,
}) => {
  const [loading, setLoading] = useState(false);

  // Keyboard dismiss
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const presets = [
    {
      id: '7h42m',
      title: 'Away 7h 42m (Hackathon Baseline)',
      description:
        'Canonical demo state: RELIANCE +3.8% surge, TCS crossed 30-day high, HDFCBANK reversed intraday (-2.7%).',
      tag: 'Recommended Baseline',
      badgeClass: 'bg-[var(--color-green-soft)] text-[var(--color-green)] border border-[var(--color-green)]/20',
    },
    {
      id: '2h',
      title: 'Away 2 Hours',
      description: 'Moderate intraday absence: catches midday volume surge and momentum shifts.',
      tag: 'Intraday',
      badgeClass: 'bg-[var(--color-panel)] text-[var(--color-muted)] border border-[var(--color-border-soft)]',
    },
    {
      id: '24h',
      title: 'Away 1 Full Day (24h)',
      description: 'Multi-session gap: tests overnight gaps, global market spillover, and multi-day breakouts.',
      tag: 'Daily Review',
      badgeClass: 'bg-[var(--color-panel)] text-[var(--color-muted)] border border-[var(--color-border-soft)]',
    },
    {
      id: '3d',
      title: 'Away 3 Days (Weekend / Break)',
      description: 'Extended return: deep accumulation changes and major sector rotation highlights.',
      tag: 'Swing Review',
      badgeClass: 'bg-[var(--color-panel)] text-[var(--color-muted)] border border-[var(--color-border-soft)]',
    },
    {
      id: '15m',
      title: 'Just Stepped Out (15m)',
      description: 'Recent sync: low delta variance, tests minimal noise suppression.',
      tag: 'Realtime',
      badgeClass: 'bg-[var(--color-panel)] text-[var(--color-muted)] border border-[var(--color-border-soft)]',
    },
  ];

  const handleApply = async (presetId: string) => {
    setLoading(true);
    try {
      await onSelectPreset(presetId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-ink)]/10 backdrop-blur-md"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Simulate market absence duration"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] shadow-2xl p-6 text-[var(--color-ink)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border-soft)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-normal ">Return Simulation</h3>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[var(--color-panel)] text-[var(--color-muted)] font-mono border border-[var(--color-border-soft)]">
                    Time Engine
                  </span>
                </div>
                <p className="text-xs text-[var(--color-faint)] font-normal mt-0.5">
                  Currently simulated absence:{' '}
                  <strong className="text-[var(--color-ink)] font-mono font-medium">{currentAwayFormatted}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[var(--color-muted)] my-4 leading-relaxed font-normal">
            Select an absence duration to simulate returning after being away. The engine will instantly recalculate
            personalized price deltas, Nazar narrative, and attention scores.
          </p>

          {/* Presets List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1" role="listbox" aria-label="Absence duration presets">
            {presets.map((p) => {
              const isRecommended = p.id === '7h42m';
              return (
                <button
                  key={p.id}
                  onClick={() => handleApply(p.id)}
                  disabled={loading}
                  aria-label={`Simulate ${p.title}`}
                  className={`w-full text-left p-4 rounded-2xl border transition-all group ${
                    isRecommended
                      ? 'bg-[var(--color-green-soft)] border-[var(--color-green)]/30 hover:border-[var(--color-green)]/60'
                      : 'bg-[var(--color-background)] hover:bg-[var(--color-panel)] border-[var(--color-border-soft)] hover:border-[var(--color-border)]'
                  } disabled:opacity-50 disabled:cursor-wait`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {isRecommended && (
                        <Star className="w-3 h-3 text-[var(--color-green)] fill-[var(--color-green)]" aria-hidden />
                      )}
                      <span
                        className={`text-sm font-medium transition-colors ${isRecommended ? 'text-[var(--color-green)]' : 'text-[var(--color-ink)] group-hover:text-[var(--color-green)]'}`}
                      >
                        {p.title}
                      </span>
                    </div>
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${p.badgeClass}`}>
                      {p.tag}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-faint)] leading-relaxed font-normal">{p.description}</p>
                </button>
              );
            })}
          </div>

          {/* Footer Guide */}
          <div className="mt-5 pt-4 border-t border-[var(--color-border-soft)] flex items-center justify-between text-[11px] text-[var(--color-faint)] font-mono">
            <span>Deterministic state machine · No random data</span>
            <span>Nazar 2026 Engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
