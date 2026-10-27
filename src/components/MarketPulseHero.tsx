import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle, ChevronRight, AlertCircle, HelpCircle } from 'lucide-react';
import { MarketEvent, MarketPulse, Stock } from '../types';
import { Sparkline } from './Sparkline';

interface MarketPulseHeroProps {
  pulse: MarketPulse | null;
  stocks: Stock[];
  events: MarketEvent[];
  onSelectStock: (symbol: string) => void;
  onAcknowledgeEvent: (eventId: string) => void;
  onOpenTimeTravel: () => void;
  filterOnlyImportant: boolean;
  onToggleFilterImportant: (val: boolean) => void;
  onOpenWhyModal: (stock: Stock) => void;
}

// ── Greeting based on time of day ──────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function PulseSkeleton() {
  return (
    <div className="w-full py-12 px-4 max-w-7xl mx-auto" aria-busy="true" aria-label="Loading market pulse">
      <div className="h-4 w-24 skeleton rounded mb-4" />
      <div className="h-14 w-80 skeleton rounded mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ── Numbered pulse item (01, 02, 03…) ──────────────────────────────────────
interface PulseItemProps {
  stock: Stock;
  rank: number;
  onSelect: () => void;
  onWhy: () => void;
  isAcknowledged: boolean;
  /** Undefined when the stock has no timeline events to acknowledge. */
  onAck?: (e: React.MouseEvent) => void;
  delay?: number;
}

function PulseItem({ stock, rank, onSelect, onWhy, isAcknowledged, onAck, delay = 0 }: PulseItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const isPos = stock.userDelta.percentDiff >= 0;
  const isHighAttention = stock.attentionScore >= 70;
  const isVolAlert = stock.volumeRatio >= 2;

  const levelClass =
    stock.attentionLevel === 'high'
      ? 'attention-high'
      : stock.attentionLevel === 'medium'
        ? 'attention-medium'
        : 'attention-low';

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onSelect}
      className={`group relative premium-card ${levelClass} rounded-2xl p-5 sm:p-6 cursor-pointer flex flex-col gap-4`}
      role="button"
      tabIndex={0}
      aria-label={`${stock.symbol}: ${isPos ? '+' : ''}${stock.userDelta.percentDiff.toFixed(2)}% since last visit. Attention score ${stock.attentionScore}. Press Enter to view details.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Rank + Symbol row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[var(--color-faint)] tabular-nums w-6 shrink-0">
            {String(rank).padStart(2, '0')}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-normal text-[var(--color-ink)]">{stock.symbol}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)] font-mono">
                {stock.exchange}
              </span>
              {isVolAlert && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--color-red-soft)] text-[var(--color-red)] uppercase font-medium">
                  Vol ×{stock.volumeRatio}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-muted)] font-normal mt-0.5 line-clamp-1">{stock.name}</p>
          </div>
        </div>

        {/* Delta */}
        <div className="text-right shrink-0">
          <div
            className={`text-xl font-mono font-normal tabular-nums ${isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
          >
            {isPos ? '+' : ''}
            {stock.userDelta.percentDiff.toFixed(2)}%
          </div>
          <div className="text-[10px] text-[var(--color-faint)] font-mono mt-0.5">
            ₹{stock.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Sparkline + narrative */}
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <Sparkline data={stock.sparkline} width={80} height={28} isPositive={isPos} strokeWidth={1.5} />
        </div>
        <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed font-normal line-clamp-2 flex-1">
          {stock.userDelta.narrative}
        </p>
      </div>

      {/* Footer: score + Why? + ack */}
      <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3 gap-2">
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-faint)] font-mono uppercase ">
          <span>
            Score{' '}
            <strong className={isHighAttention ? 'text-[var(--color-green)]' : 'text-[var(--color-muted)]'}>
              {stock.attentionScore}
            </strong>
          </span>
          <span className="text-[var(--color-border)]">·</span>
          <span>{stock.userDelta.lastSeenTimeFormatted} ago</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Why? — inline explanation trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWhy();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] text-[10px] uppercase font-semibold transition-colors"
            aria-label={`Why does ${stock.symbol} deserve attention?`}
          >
            <HelpCircle className="w-3 h-3" />
            <span>Why?</span>
          </button>

          {/* Acknowledge */}
          {onAck && (
            <button
              onClick={onAck}
              className={`p-1.5 rounded-full transition-colors ${isAcknowledged ? 'text-[var(--color-green)] bg-[var(--color-green-soft)]' : 'text-[var(--color-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-panel)]'}`}
              aria-label={isAcknowledged ? 'Acknowledged' : 'Acknowledge this change'}
              title={isAcknowledged ? 'Acknowledged' : 'Mark as seen'}
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {/* View detail */}
          <ChevronRight
            className="w-4 h-4 text-[var(--color-faint)] group-hover:text-[var(--color-muted)] transition-colors"
            aria-hidden
          />
        </div>
      </div>
    </motion.article>
  );
}

// ── Flagship Stock Card (rank #1) ───────────────────────────────────────────
interface FlagshipCardProps {
  stock: Stock;
  onSelect: () => void;
  onWhy: () => void;
  isAcknowledged: boolean;
  /** Undefined when the stock has no timeline events to acknowledge. */
  onAck?: (e: React.MouseEvent) => void;
}

function FlagshipCard({ stock, onSelect, onWhy, isAcknowledged, onAck }: FlagshipCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const isPos = stock.userDelta.percentDiff >= 0;

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onSelect}
      className="group relative premium-card inner-highlight attention-high rounded-2xl p-6 sm:p-8 cursor-pointer mb-4 overflow-hidden"
      role="button"
      tabIndex={0}
      aria-label={`${stock.symbol} (flagship): ${isPos ? '+' : ''}${stock.userDelta.percentDiff.toFixed(2)}% since last visit. Attention score ${stock.attentionScore}. Press Enter to view details.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Subtle atmospheric gradient tied to sentiment */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15] transition-colors duration-500"
        style={{
          background: isPos
            ? 'radial-gradient(circle at 100% 0%, var(--color-green), transparent 50%)'
            : 'radial-gradient(circle at 100% 0%, var(--color-red), transparent 50%)',
        }}
      />
      <div className="relative z-10 flex flex-col md:flex-row gap-6">
        {/* Left: content */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Symbol + tags */}
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-[10px] font-mono text-[var(--color-faint)] tracking-[0.4em] uppercase">01</span>
              <span className="text-2xl font-semibold text-[var(--color-ink)]">{stock.symbol}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)] font-mono">
                {stock.exchange}
              </span>
              <span
                className={`text-[9px] font-medium px-2 py-0.5 rounded-full uppercase ${isPos ? 'bg-[var(--color-green-soft)] text-[var(--color-green)]' : 'bg-[var(--color-red-soft)] text-[var(--color-red)]'}`}
              >
                {stock.scoreFactors[0]?.label?.split(' ').slice(0, 2).join(' ') || (isPos ? 'Momentum' : 'Reversal')}
              </span>
            </div>
            <p className="prose-market max-w-xl line-clamp-3">{stock.userDelta.narrative}</p>
          </div>

          {/* Last check → now comparison */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-[9px] uppercase tracking-normal text-[var(--color-faint)] mb-0.5">Last seen</div>
              <div className="font-mono text-[var(--color-muted)] text-sm tabular-nums">
                ₹{stock.userDelta.previousPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[var(--color-border)] font-mono" aria-hidden>
              →
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-normal text-[var(--color-faint)] mb-0.5">Now</div>
              <div className="font-mono text-[var(--color-ink)] font-medium text-sm tabular-nums">
                ₹{stock.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-normal text-[var(--color-faint)] mb-0.5">Change</div>
              <div
                className={`font-mono font-medium tabular-nums ${isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
              >
                {isPos ? '+' : ''}
                {stock.userDelta.percentDiff.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Right: attention score + sparkline + actions */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-between md:min-w-[160px] gap-4">
          <div className="flex flex-col items-end">
            <div className="text-[9px] uppercase tracking-normal text-[var(--color-faint)] mb-1">Attention</div>
            <div className="flex items-center justify-center relative">
              <div className="absolute inset-0 border-b-2 border-[var(--color-border-soft)] w-[120%] -left-[10%] bottom-1" />
              <div
                className="absolute bottom-1 h-0.5 transition-all duration-700"
                style={{
                  left: '-10%',
                  width: `${Math.min(120, stock.attentionScore * 1.2)}%`,
                  backgroundColor:
                    stock.attentionScore >= 70
                      ? 'var(--color-green)'
                      : stock.attentionScore >= 55
                        ? 'var(--color-amber)'
                        : 'var(--color-border)',
                }}
              />
              <div
                className={`text-5xl sm:text-6xl font-mono font-semibold leading-none relative z-10 pb-2 ${stock.attentionScore >= 70 ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}`}
              >
                {stock.attentionScore}
              </div>
            </div>
          </div>

          <div className="hidden sm:block">
            <Sparkline data={stock.sparkline} width={110} height={30} isPositive={isPos} strokeWidth={2} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWhy();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] text-[10px] uppercase font-medium transition-colors"
              aria-label={`Why does ${stock.symbol} deserve attention?`}
            >
              <HelpCircle className="w-3 h-3" />
              Why?
            </button>

            {onAck && (
              <button
                onClick={onAck}
                className={`p-1.5 rounded-full transition-colors ${isAcknowledged ? 'text-[var(--color-green)] bg-[var(--color-green-soft)]' : 'text-[var(--color-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-panel)]'}`}
                aria-label={isAcknowledged ? 'Acknowledged' : 'Acknowledge this change'}
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export const MarketPulseHero: React.FC<MarketPulseHeroProps> = ({
  pulse,
  stocks,
  events,
  onSelectStock,
  onAcknowledgeEvent,
  onOpenTimeTravel,
  filterOnlyImportant,
  onToggleFilterImportant,
  onOpenWhyModal,
}) => {
  if (!pulse) return <PulseSkeleton />;

  const keyStocks = [...stocks].sort((a, b) => b.attentionScore - a.attentionScore);
  const displayStocks = filterOnlyImportant
    ? keyStocks.filter((s) => s.attentionScore >= 55 || s === keyStocks[0]).slice(0, 5)
    : keyStocks;

  const flagshipStock = displayStocks[0];
  const secondaryStocks = displayStocks.slice(1, 4);

  // Stat strip values
  const highAttentionSymbols =
    stocks
      .filter((s) => s.attentionScore >= 70)
      .slice(0, 2)
      .map((s) => s.symbol)
      .join(', ') || 'RELIANCE, TCS';

  const volatilitySymbol = stocks.find((s) => s.changePercent24h < -1.5 || s.volumeRatio >= 2)?.symbol || 'HDFCBANK';

  // Cards represent stocks; acknowledging a card acknowledges that stock's timeline events.
  const eventsFor = (symbol: string) => events.filter((ev) => ev.stockSymbol === symbol && !ev.dismissed);
  const isAcknowledged = (symbol: string) => {
    const stockEvents = eventsFor(symbol);
    return stockEvents.length > 0 && stockEvents.every((ev) => ev.acknowledged);
  };
  const ackHandler = (symbol: string) => {
    if (eventsFor(symbol).length === 0) return undefined;
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      eventsFor(symbol)
        .filter((ev) => !ev.acknowledged)
        .forEach((ev) => onAcknowledgeEvent(ev.id));
    };
  };

  return (
    <section className="relative w-full pt-8 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <div
            className="text-[10px] uppercase tracking-normal text-[var(--color-faint)] font-medium"
            aria-label="Section: The Briefing"
          >
            The Briefing
          </div>
          <button
            onClick={onOpenTimeTravel}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border-soft)] text-[11px] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            aria-label={`You were away ${pulse.awayDurationFormatted}. Click to simulate a different absence duration.`}
          >
            <Clock className="w-3 h-3 text-[var(--color-green)]" aria-hidden />
            <span className="text-[var(--color-faint)]">Away:</span>
            <strong className="text-[var(--color-ink)] font-mono font-medium">{pulse.awayDurationFormatted}</strong>
            <span className="text-[9px] text-[var(--color-green)] ml-0.5 underline decoration-[var(--color-border)]">
              Simulate
            </span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-[var(--color-ink)] mb-6">
          {getGreeting()}
          <br />
          <span className="text-[var(--color-muted)]">{pulse.meaningfulChangesCount} things changed meaningfully.</span>
        </h1>

        {/* Editorial stat strip */}
        <div
          className="flex flex-wrap gap-8 sm:gap-12 border-l border-[var(--color-border)] pl-6 ml-1"
          role="region"
          aria-label="Market overview stats"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[var(--color-faint)]">Portfolio Impact</span>
            <span
              className={`text-2xl sm:text-3xl font-normal font-mono tabular-nums ${pulse.overallWatchlistChange >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
            >
              {pulse.overallWatchlistChange >= 0 ? '+' : ''}
              {pulse.overallWatchlistChange}%
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[var(--color-faint)]">High Attention</span>
            <span className="text-xl sm:text-2xl font-semibold text-[var(--color-ink)] ">{highAttentionSymbols}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[var(--color-faint)]">Volatility</span>
            <span className="text-xl sm:text-2xl font-semibold text-[var(--color-red)] ">{volatilitySymbol}</span>
          </div>
        </div>
      </header>

      {/* ── Priority Intelligence header ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 flex-1 text-[10px] uppercase tracking-normal text-[var(--color-faint)] font-medium">
          <span>Priority Intelligence</span>
          <div className="flex-1 h-px bg-[var(--color-border-soft)]" aria-hidden />
        </div>
        <div
          className="flex items-center gap-1 bg-[var(--color-panel)] p-1 rounded-full border border-[var(--color-border-soft)]"
          role="group"
          aria-label="Filter options"
        >
          {[
            { label: 'What matters', value: true },
            { label: `All (${stocks.length})`, value: false },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onToggleFilterImportant(opt.value)}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-semibold transition-all ${
                filterOnlyImportant === opt.value
                  ? 'bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-ink)] shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
              aria-pressed={filterOnlyImportant === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Flagship Card ─────────────────────────────────────────────────── */}
      {flagshipStock && (
        <FlagshipCard
          stock={flagshipStock}
          onSelect={() => onSelectStock(flagshipStock.symbol)}
          onWhy={() => onOpenWhyModal(flagshipStock)}
          isAcknowledged={isAcknowledged(flagshipStock.symbol)}
          onAck={ackHandler(flagshipStock.symbol)}
        />
      )}

      {/* ── Secondary Pulse Items (numbered 02, 03, 04…) ─────────────────── */}
      {secondaryStocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {secondaryStocks.map((stock, idx) => (
            <div key={stock.symbol}>
              <PulseItem
                stock={stock}
                rank={idx + 2}
                onSelect={() => onSelectStock(stock.symbol)}
                onWhy={() => onOpenWhyModal(stock)}
                isAcknowledged={isAcknowledged(stock.symbol)}
                onAck={ackHandler(stock.symbol)}
                delay={0.08 * (idx + 1)}
              />
            </div>
          ))}
        </div>
      )}

      <div
        className="p-4 rounded-2xl premium-card flex flex-col sm:flex-row items-center justify-between gap-3"
        role="region"
        aria-label="Watchlist summary"
      >
        <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
          <div
            className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] motion-safe-pulse"
            style={{ boxShadow: '0 0 6px var(--color-green-soft)' }}
            aria-hidden
          />
          <span className="text-[10px] uppercase tracking-normal text-[var(--color-faint)] font-medium">
            Watchlist Ledger
          </span>
          <span>
            Overall:{' '}
            <strong
              className={`font-mono tabular-nums ${pulse.overallWatchlistChange >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
            >
              {pulse.overallWatchlistChange >= 0 ? '+' : ''}
              {pulse.overallWatchlistChange}%
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono" aria-label="Market movement summary">
          <div className="flex items-center gap-1.5 text-[var(--color-green)]">
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
            <span>{pulse.positiveCount} advancing</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-red)]">
            <ArrowDownRight className="w-3.5 h-3.5" aria-hidden />
            <span>{pulse.negativeCount} declining</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-amber)]">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden />
            <span>{pulse.eventsCount} key shifts</span>
          </div>
        </div>
      </div>
    </section>
  );
};
