import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Check } from 'lucide-react';
import { MarketEvent } from '../types';
import { Sparkline } from './Sparkline';

interface ChangeTimelineProps {
  events: MarketEvent[];
  onSelectStock: (symbol: string) => void;
  onAcknowledgeEvent: (id: string) => void;
  onDismissEvent: (id: string) => void;
}

export const ChangeTimeline: React.FC<ChangeTimelineProps> = ({
  events,
  onSelectStock,
  onAcknowledgeEvent,
  onDismissEvent,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'breakouts' | 'volume'>('all');
  const [acknowledgedLocal, setAcknowledgedLocal] = useState<Set<string>>(new Set());

  const filteredEvents = events.filter((e) => {
    if (e.dismissed) return false;
    if (activeFilter === 'critical') return e.importance === 'critical';
    if (activeFilter === 'breakouts') return e.changeType.includes('breakout');
    if (activeFilter === 'volume') return e.changeType.includes('volume');
    return true;
  });

  const handleAck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcknowledgedLocal((prev) => new Set([...prev, id]));
    onAcknowledgeEvent(id);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDismissEvent(id);
  };

  const getImportanceBadge = (importance: MarketEvent['importance']) => {
    switch (importance) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded bg-[var(--color-red-soft)] text-[var(--color-red)] text-[10px] font-mono uppercase font-medium ">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded bg-[var(--color-amber)]/10 text-[var(--color-amber)] text-[10px] font-mono uppercase font-medium ">
            High Impact
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-[var(--color-panel)] text-[var(--color-muted)] text-[10px] font-mono uppercase border border-[var(--color-border-soft)]">
            Notice
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--color-faint)] mb-2 font-medium">
            Timeline Dispatch
          </div>
          <h2 className="text-3xl sm:text-4xl font-normal text-[var(--color-ink)] ">Chronological Shift Log</h2>
          <p className="text-xs text-[var(--color-muted)] mt-1 font-normal">
            Deterministic sequence of technical and fundamental shifts during your absence.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[var(--color-panel)] p-1 rounded-full border border-[var(--color-border-soft)] self-start sm:self-auto">
          {(
            [
              { id: 'all', label: 'All Events' },
              { id: 'critical', label: 'Critical' },
              { id: 'breakouts', label: 'Breakouts' },
              { id: 'volume', label: 'Surges' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-semibold transition-colors ${
                activeFilter === f.id
                  ? 'bg-[var(--color-background)] text-[var(--color-ink)] shadow-sm border border-[var(--color-border)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)]">
          <CheckCircle2 className="w-8 h-8 text-[var(--color-green)] mx-auto mb-2 opacity-60" />
          <p className="text-sm font-normal">All changes have been acknowledged or filtered.</p>
        </div>
      ) : (
        <div className="relative border-l border-[var(--color-border-soft)] ml-4 sm:ml-8 pl-6 sm:pl-8 space-y-6">
          <AnimatePresence>
            {filteredEvents.map((evt, idx) => {
              const isAck = evt.acknowledged || acknowledgedLocal.has(evt.id);
              const isPositive = evt.change.startsWith('+');

              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => onSelectStock(evt.stockSymbol)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectStock(evt.stockSymbol);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${evt.stockSymbol}: ${evt.title} (${evt.change}). Open details.`}
                  className={`group relative p-6 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isAck
                      ? 'bg-[var(--color-panel)] border-[var(--color-border-soft)] opacity-60'
                      : 'bg-[var(--color-background)] hover:bg-[var(--color-panel)] border-[var(--color-border)] hover:border-[var(--color-muted)] shadow-sm'
                  }`}
                >
                  {/* Timeline Anchor Dot */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-7 w-2.5 h-2.5 rounded-full border-2 ${
                      evt.importance === 'critical'
                        ? 'bg-[var(--color-red)] border-[var(--color-background)]'
                        : evt.importance === 'high'
                          ? 'bg-[var(--color-amber)] border-[var(--color-background)]'
                          : 'bg-[var(--color-green)] border-[var(--color-background)]'
                    }`}
                  />

                  {/* Event Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-[var(--color-green)] font-medium">
                        {evt.timeFormatted}
                      </span>
                      <span className="text-[var(--color-border)]">•</span>
                      <span className="font-mono font-medium text-sm text-[var(--color-ink)] transition-colors">
                        {evt.stockSymbol}
                      </span>
                      <span className="text-xs text-[var(--color-faint)] hidden sm:inline truncate max-w-[140px] font-normal">
                        {evt.stockName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs font-medium px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-[var(--color-green-soft)] text-[var(--color-green)]'
                            : 'bg-[var(--color-red-soft)] text-[var(--color-red)]'
                        }`}
                      >
                        {evt.change}
                      </span>
                      {getImportanceBadge(evt.importance)}
                    </div>
                  </div>

                  {/* Title & Narrative */}
                  <h4 className="text-sm font-medium text-[var(--color-ink)] mb-1.5 ">{evt.title}</h4>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed font-normal mb-4">
                    {evt.explanation}
                  </p>

                  {/* Bottom: Mini chart & actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-soft)]">
                    <div>
                      {evt.miniChart && evt.miniChart.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase text-[var(--color-faint)] font-mono">Trajectory</span>
                          <Sparkline
                            data={evt.miniChart}
                            width={70}
                            height={18}
                            isPositive={isPositive}
                            strokeWidth={1.5}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleAck(evt.id, e)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] uppercase font-semibold transition-colors ${
                          isAck
                            ? 'text-[var(--color-green)] bg-[var(--color-green-soft)]'
                            : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-border-soft)]'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{isAck ? 'Acknowledged' : 'Acknowledge'}</span>
                      </button>

                      <button
                        onClick={(e) => handleDismiss(evt.id, e)}
                        className="p-1 rounded-md text-[var(--color-faint)] hover:text-[var(--color-red)] hover:bg-[var(--color-red-soft)] transition-colors"
                        title="Dismiss event"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
