import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X } from 'lucide-react';
import { useEscapeKey } from '../lib/useEscapeKey';
import { useFocusTrap } from '../lib/useFocusTrap';

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

  useEscapeKey(onClose, isOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, isOpen);

  if (!isOpen) return null;

  const presets = [
    {
      id: '7h42m',
      title: 'Away 7h 42m',
      description:
        'The demo scenario: RELIANCE up 3.8% on heavy volume, TCS above its 30-day high, HDFCBANK reversing.',
    },
    { id: '15m', title: 'Away 15 minutes', description: 'Just stepped out: very little has changed.' },
    { id: '2h', title: 'Away 2 hours', description: 'Part of a trading session: the first moves of the day.' },
    { id: '24h', title: 'Away 1 day', description: 'A full day: larger moves since your last visit.' },
    { id: '3d', title: 'Away 3 days', description: 'A long weekend: the largest changes since your last visit.' },
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
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
          className="relative w-full max-w-lg rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] shadow-[var(--shadow-float)] p-6 text-[var(--color-ink)] overflow-hidden"
          ref={panelRef}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-[var(--color-panel)] text-[var(--color-muted)]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Simulate time away</h3>
                <p className="text-sm text-[var(--color-muted)] font-normal mt-0.5">
                  Currently away for{' '}
                  <strong className="text-[var(--color-ink)] font-mono font-medium">{currentAwayFormatted}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-full hover:bg-[var(--color-panel)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-[var(--color-muted)] my-4 leading-relaxed font-normal">
            Pick how long you were away. Price changes, narratives and attention scores update instantly.
          </p>

          {/* Presets List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1" role="listbox" aria-label="Absence duration presets">
            {presets.map((p) => {
              const isDemoDefault = p.id === '7h42m';
              return (
                <button
                  key={p.id}
                  onClick={() => handleApply(p.id)}
                  disabled={loading}
                  aria-label={`Simulate ${p.title}`}
                  className="w-full text-left px-4 py-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-green)] bg-[var(--color-background)] transition-colors group disabled:opacity-50 disabled:cursor-wait"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[var(--color-ink)] group-hover:text-[var(--color-green)] transition-colors">
                      {p.title}
                    </span>
                    {isDemoDefault && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--color-green-soft)] text-[var(--color-green)] whitespace-nowrap">
                        Demo default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed font-normal">{p.description}</p>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
