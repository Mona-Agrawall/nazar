import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle, ChevronRight, AlertCircle, HelpCircle } from 'lucide-react';
import { MarketEvent, MarketPulse, Stock } from '../types';
import { Sparkline } from './Sparkline';
import { eventIdsToAcknowledge, eventsForStock, isStockAcknowledged } from '../lib/pulseAck';
import { currencySymbol, formatPrice } from '../lib/currency';

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
          <div key={i} className="h-48 skeleton rounded-lg" />
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

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onSelect}
      className={`group relative premium-card rounded-lg p-5 sm:p-6 cursor-pointer flex flex-col gap-4`}
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
          <span className="sr-only">Rank {rank}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-medium text-[var(--color-ink)]">{stock.symbol}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)] font-mono">
                {stock.exchange}
              </span>
              {isVolAlert && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-red-soft)] text-[var(--color-red)] font-medium">
                  Vol ×{stock.volumeRatio}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-muted)] font-normal mt-0.5 line-clamp-1">{stock.name}</p>
          </div>
        </div>

        {/* Delta */}
        <div className="text-right shrink-0">
          <div
            className={`text-base font-mono font-medium tabular-nums ${isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
          >
            {isPos ? '+' : ''}
            {stock.userDelta.percentDiff.toFixed(2)}%
          </div>
          <div className="text-xs text-[var(--color-faint)] font-mono mt-0.5">
            {currencySymbol(stock.exchange)}
            {formatPrice(stock.currentPrice)}
          </div>
        </div>
      </div>

      {/* Sparkline + narrative */}
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <Sparkline data={stock.sparkline} width={80} height={28} isPositive={isPos} strokeWidth={1.5} />
        </div>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed font-normal line-clamp-2 flex-1">
          {stock.userDelta.narrative}
        </p>
      </div>

      {/* Footer: score + Why? + ack */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 gap-2">
        <div className="flex items-center gap-3 text-xs text-[var(--color-muted)] font-mono">
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] text-xs font-medium transition-colors"
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
      className="group relative premium-card rounded-lg p-6 cursor-pointer mb-4"
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
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: content */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Symbol + tags */}
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-xl font-medium text-[var(--color-ink)]">{stock.symbol}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)] font-mono">
                {stock.exchange}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPos ? 'bg-[var(--color-green-soft)] text-[var(--color-green)]' : 'bg-[var(--color-red-soft)] text-[var(--color-red)]'}`}
              >
                {stock.scoreFactors[0]?.label?.split(' ').slice(0, 2).join(' ') || (isPos ? 'Momentum' : 'Reversal')}
              </span>
            </div>
            <p className="prose-market max-w-xl line-clamp-3">{stock.userDelta.narrative}</p>
          </div>

          {/* Last check → now comparison */}
          <div className="flex items-center gap-8">
            <div>
              <div className="text-xs tracking-normal text-[var(--color-faint)] mb-0.5">Last seen</div>
              <div className="font-mono text-[var(--color-muted)] text-sm tabular-nums">
                {currencySymbol(stock.exchange)}
                {formatPrice(stock.userDelta.previousPrice)}
              </div>
            </div>
            <div className="text-[var(--color-border)] font-mono" aria-hidden>
              →
            </div>
            <div>
              <div className="text-xs tracking-normal text-[var(--color-faint)] mb-0.5">Now</div>
              <div className="font-mono text-[var(--color-ink)] font-medium text-sm tabular-nums">
                {currencySymbol(stock.exchange)}
                {formatPrice(stock.currentPrice)}
              </div>
            </div>
            <div>
              <div className="text-xs tracking-normal text-[var(--color-faint)] mb-0.5">Change</div>
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
          <div className="flex flex-col items-end w-36">
            <div className="text-xs text-[var(--color-muted)] mb-1">Attention score</div>
            <div className="text-3xl font-mono font-medium leading-none text-[var(--color-ink)]">
              {stock.attentionScore}
              <span className="text-sm text-[var(--color-faint)] font-normal">/100</span>
            </div>
            <div className="mt-2.5 h-1 w-full rounded-full bg-[var(--color-border-soft)] overflow-hidden" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${stock.attentionScore}%`,
                  backgroundColor:
                    stock.attentionScore >= 70
                      ? 'var(--color-green)'
                      : stock.attentionScore >= 55
                        ? 'var(--color-amber)'
                        : 'var(--color-faint)',
                }}
              />
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] text-xs font-medium transition-colors"
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
      .join(', ') || 'None';

  const volatilitySymbol = stocks.find((s) => s.changePercent24h < -1.5 || s.volumeRatio >= 2)?.symbol || 'None';

  // Cards represent stocks; acknowledging a card acknowledges that stock's timeline events.
  const isAcknowledged = (symbol: string) => isStockAcknowledged(events, symbol);
  const ackHandler = (symbol: string) => {
    if (eventsForStock(events, symbol).length === 0) return undefined;
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      eventIdsToAcknowledge(events, symbol).forEach((id) => onAcknowledgeEvent(id));
    };
  };

  return (
    <section className="relative w-full pt-8 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium leading-tight text-[var(--color-ink)]">{getGreeting()}</h1>
            <p className="text-base text-[var(--color-muted)] mt-1">
              {pulse.meaningfulChangesCount === 0
                ? 'Nothing changed meaningfully while you were away.'
                : `${pulse.meaningfulChangesCount} ${pulse.meaningfulChangesCount === 1 ? 'thing' : 'things'} changed meaningfully while you were away.`}
            </p>
          </div>
          <button
            onClick={onOpenTimeTravel}
            className="flex items-center gap-2 h-9 px-3.5 rounded-md border border-[var(--color-border)] hover:border-[#dddee1] text-sm text-[var(--color-muted)] transition-colors"
            aria-label={`You were away ${pulse.awayDurationFormatted}. Click to simulate a different absence duration.`}
          >
            <Clock className="w-4 h-4 text-[var(--color-muted)]" aria-hidden />
            <span>Away</span>
            <strong className="text-[var(--color-ink)] font-mono font-medium">{pulse.awayDurationFormatted}</strong>
            <span className="text-[var(--color-green)] font-medium">Simulate</span>
          </button>
        </div>

        {/* Summary stats */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 rounded-lg border border-[var(--color-border)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]"
          role="region"
          aria-label="Market overview stats"
        >
          <div className="px-5 py-4">
            <div className="text-sm text-[var(--color-muted)]">Watchlist change</div>
            <div
              className={`mt-1 text-xl font-medium font-mono tabular-nums ${pulse.overallWatchlistChange >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
            >
              {pulse.overallWatchlistChange >= 0 ? '+' : ''}
              {pulse.overallWatchlistChange}%
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-sm text-[var(--color-muted)]">High attention</div>
            <div className="mt-1 text-xl font-medium text-[var(--color-ink)]">{highAttentionSymbols}</div>
          </div>
          <div className="px-5 py-4">
            <div className="text-sm text-[var(--color-muted)]">Most volatile</div>
            <div
              className={`mt-1 text-xl font-medium ${volatilitySymbol === 'None' ? 'text-[var(--color-muted)]' : 'text-[var(--color-red)]'}`}
            >
              {volatilitySymbol}
            </div>
          </div>
        </div>
      </header>

      {/* ── Priority Intelligence header ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-medium text-[var(--color-ink)]">What deserves your attention</h2>
        <div className="flex items-center gap-2" role="group" aria-label="Filter options">
          {[
            { label: 'What matters', value: true },
            { label: `All (${stocks.length})`, value: false },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onToggleFilterImportant(opt.value)}
              className={`h-8 px-3.5 rounded-full border text-sm whitespace-nowrap transition-colors ${
                filterOnlyImportant === opt.value
                  ? 'border-[var(--color-green)] bg-[var(--color-green-soft)] text-[var(--color-green)] font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
        className="p-4 rounded-lg premium-card flex flex-col sm:flex-row items-center justify-between gap-3"
        role="region"
        aria-label="Watchlist summary"
      >
        <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-ink)]">Watchlist summary</span>
          <span>
            Overall{' '}
            <strong
              className={`font-mono tabular-nums ${pulse.overallWatchlistChange >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
            >
              {pulse.overallWatchlistChange >= 0 ? '+' : ''}
              {pulse.overallWatchlistChange}%
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm font-mono" aria-label="Market movement summary">
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
