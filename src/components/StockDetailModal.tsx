import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  BarChart3,
  HelpCircle,
  Zap,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StockDetailExtended, Timeframe, PricePoint } from '../types';
import { api } from '../services/api';
import { currencySymbol } from '../lib/currency';

interface StockDetailModalProps {
  symbol: string | null;
  onClose: () => void;
  onOpenWhyModal: () => void;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '1Y', 'ALL'];

/** Hover label: time of day for 1D, day + time for 1W, a date for longer ranges. */
function formatPointTime(timestamp: number, timeframe: Timeframe): string {
  const date = new Date(timestamp);
  if (timeframe === '1D') return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (timeframe === '1W')
    return date.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ symbol, onClose, onOpenWhyModal }) => {
  const [stockDetail, setStockDetail] = useState<StockDetailExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [hoveredPoint, setHoveredPoint] = useState<(PricePoint & { x: number; y: number }) | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Load stock detail, then its explanation
  useEffect(() => {
    if (!symbol) return;
    // Ignore responses for a symbol that is no longer shown
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setStockDetail(null);
    setExplanation(null);

    api
      .getStockDetail(symbol)
      .then((data) => {
        if (cancelled) return;
        setStockDetail(data);
        setLoading(false);

        // Explanation is built from the stock's computed facts
        setIsExplanationLoading(true);
        return api.getExplanation(data).then((text) => {
          if (!cancelled) setExplanation(text);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        setLoadError(err instanceof Error ? err.message : 'Could not load this stock.');
      })
      .finally(() => {
        if (!cancelled) setIsExplanationLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, reloadKey]);

  if (!symbol) return null;

  const chartData = stockDetail?.chartData?.[timeframe] ?? [];
  const minPrice = chartData.length > 0 ? Math.min(...chartData.map((p) => p.price)) : 0;
  const maxPrice = chartData.length > 0 ? Math.max(...chartData.map((p) => p.price)) : 1;
  const priceRange = maxPrice - minPrice || 1;
  const maxVolume = chartData.length > 0 ? Math.max(...chartData.map((p) => p.volume)) : 1;

  const svgW = 720,
    svgH = 200;
  const padX = 16,
    padY = 20;
  const innerW = svgW - padX * 2;
  const innerH = svgH - padY * 2;

  const volBarH = 30; // volume bar section height below main chart

  const points = chartData.map((p, i) => ({
    x: padX + (i / Math.max(1, chartData.length - 1)) * innerW,
    y: svgH - padY - ((p.price - minPrice) / priceRange) * innerH,
    ...p,
  }));

  const pathD = points.length > 0 ? `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}` : '';
  const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x},${svgH} L ${points[0].x},${svgH} Z` : '';

  const isPositive = stockDetail ? (stockDetail.changePercent24h ?? 0) >= 0 : true;
  const strokeColor = isPositive ? 'var(--color-green)' : 'var(--color-red)';
  const displayPrice = hoveredPoint ? hoveredPoint.price : (stockDetail?.currentPrice ?? 0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * svgW;
    let closest = points[0];
    let minDiff = Infinity;
    points.forEach((p) => {
      const diff = Math.abs(p.x - relX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    });
    setHoveredPoint(closest);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[var(--color-ink)]/10 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${symbol} stock detail`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-4xl rounded-2xl glass-panel shadow-[0_24px_64px_rgba(0,0,0,0.06)] text-[var(--color-ink)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 border-b border-[var(--color-border-soft)] flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--color-ink)]">{symbol}</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-soft)] text-[var(--color-muted)] font-mono">
                  {stockDetail?.exchange || 'NSE'}
                </span>
                <span className="text-xs text-[var(--color-muted)] font-normal hidden sm:inline">
                  {stockDetail?.sector}
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5 font-normal">{stockDetail?.name}</p>
            </div>
            {stockDetail && (
              <button
                onClick={onOpenWhyModal}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border-soft)] text-[var(--color-ink)] text-xs font-mono font-medium transition-colors"
                aria-label={`Why does ${symbol} deserve attention? Attention score: ${stockDetail.attentionScore}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-green)]" aria-hidden />
                <span>Attention {stockDetail.attentionScore}</span>
                <HelpCircle className="w-3 h-3 ml-0.5 text-[var(--color-muted)]" aria-hidden />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadError ? (
          <div className="p-12 text-center text-[var(--color-muted)]" role="alert">
            <p className="text-sm text-[var(--color-ink)] mb-1">Couldn't load {symbol}.</p>
            <p className="text-xs font-normal mb-4">{loadError}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-1.5 rounded-full bg-[var(--color-panel)] hover:bg-[var(--color-border-soft)] border border-[var(--color-border)] text-xs text-[var(--color-ink)] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : loading || !stockDetail ? (
          <div className="p-12 text-center text-[var(--color-muted)]" role="status" aria-label="Loading stock data">
            <div
              className="w-6 h-6 border-2 border-[var(--color-green)] border-t-transparent rounded-full animate-spin mx-auto mb-3"
              aria-hidden
            />
            <p className="text-xs font-normal">Loading intelligence dossier…</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            {/* ── CENTERPIECE: What changed since you left? ─────────────── */}
            <div
              className="p-5 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)]"
              role="region"
              aria-label="What changed since your last visit"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-[var(--color-green)]" aria-hidden />
                <span className="text-[10px] font-mono font-medium uppercase tracking-normal text-[var(--color-green)]">
                  Since your last visit · {stockDetail.userDelta?.lastSeenTimeFormatted ?? '—'} ago
                </span>
              </div>

              {/* Price comparison — the product's core UX */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-4">
                <div>
                  <div className="text-[9px] uppercase tracking-normal text-[var(--color-faint)] mb-1">Last seen</div>
                  <div className="font-mono text-2xl text-[var(--color-muted)] font-normal tabular-nums">
                    {currencySymbol(stockDetail.exchange)}
                    {(stockDetail.userDelta?.previousPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-[var(--color-border)] font-mono text-xl" aria-hidden>
                  →
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-normal text-[var(--color-faint)] mb-1">Now</div>
                  <div className="font-mono text-2xl text-[var(--color-ink)] font-medium tabular-nums">
                    {currencySymbol(stockDetail.exchange)}
                    {(stockDetail.currentPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-normal text-[var(--color-faint)] mb-1">Change</div>
                  <div
                    className={`flex items-center gap-1 font-mono text-2xl font-medium tabular-nums ${(stockDetail.userDelta?.percentDiff ?? 0) >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
                  >
                    {(stockDetail.userDelta?.percentDiff ?? 0) >= 0 ? (
                      <ArrowUpRight className="w-5 h-5" aria-hidden />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" aria-hidden />
                    )}
                    {(stockDetail.userDelta?.percentDiff ?? 0) >= 0 ? '+' : ''}
                    {(stockDetail.userDelta?.percentDiff ?? 0).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Why it matters */}
              <div className="border-t border-[var(--color-border-soft)] pt-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-[var(--color-green)]" aria-hidden />
                  <span className="text-[9px] uppercase tracking-normal text-[var(--color-green)] opacity-80 font-medium">
                    Why it matters
                  </span>
                </div>
                {isExplanationLoading ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 border border-[var(--color-green)]/50 border-t-transparent rounded-full animate-spin"
                      aria-hidden
                    />
                    <span className="text-xs text-[var(--color-faint)] font-normal" aria-live="polite">
                      Generating insight…
                    </span>
                  </div>
                ) : (
                  <p className="prose-market" aria-live="polite">
                    {explanation || stockDetail.userDelta.narrative}
                  </p>
                )}
              </div>
            </div>

            {/* ── Price Chart + Timeframe selector ────────────────────────── */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl sm:text-4xl font-mono font-normal text-[var(--color-ink)] tabular-nums">
                      {currencySymbol(stockDetail.exchange)}
                      {displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`inline-flex items-center text-sm font-mono font-medium ${isPositive ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4 mr-0.5" aria-hidden />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-0.5" aria-hidden />
                      )}
                      {isPositive ? '+' : ''}
                      {(stockDetail.changePercent24h ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-muted)] font-mono mt-0.5">
                    {hoveredPoint ? (
                      <span>
                        {timeframe === '1D' ? 'Time' : 'Date'}:{' '}
                        <strong className="text-[var(--color-ink)]">
                          {formatPointTime(hoveredPoint.timestamp, timeframe)}
                        </strong>{' '}
                        · Vol:{' '}
                        <strong className="text-[var(--color-ink)]">
                          {(hoveredPoint.volume / 1_000_000).toFixed(2)}M
                        </strong>
                      </span>
                    ) : (
                      <span>
                        Range: {currencySymbol(stockDetail.exchange)}
                        {(stockDetail.dayLow ?? 0).toLocaleString('en-IN')} – {currencySymbol(stockDetail.exchange)}
                        {(stockDetail.dayHigh ?? 0).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 p-1 rounded-full bg-[var(--color-panel)] border border-[var(--color-border-soft)]"
                  role="group"
                  aria-label="Chart timeframe"
                >
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all ${timeframe === tf ? 'bg-[var(--color-background)] text-[var(--color-ink)] border border-[var(--color-border)] shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}
                      aria-pressed={timeframe === tf}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price SVG chart */}
              <div className="relative w-full rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] overflow-hidden p-2">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full cursor-crosshair"
                  style={{ height: '200px' }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredPoint(null)}
                  role="img"
                  aria-label={`${symbol} price chart for ${timeframe}`}
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.12" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  {[0.25, 0.5, 0.75].map((f) => (
                    <line
                      key={f}
                      x1={0}
                      y1={padY + innerH * f}
                      x2={svgW}
                      y2={padY + innerH * f}
                      stroke="var(--color-border-soft)"
                      strokeDasharray="3 4"
                    />
                  ))}

                  <path d={areaD} fill="url(#areaGrad)" />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Crosshair */}
                  {hoveredPoint && (
                    <g>
                      <line
                        x1={hoveredPoint.x}
                        y1={padY}
                        x2={hoveredPoint.x}
                        y2={svgH - padY}
                        stroke="var(--color-border)"
                        strokeWidth="1"
                        strokeDasharray="2 3"
                      />
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.y}
                        r="4"
                        fill="var(--color-background)"
                        stroke={strokeColor}
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>

                {/* Volume bars — separate small chart below */}
                <svg
                  viewBox={`0 0 ${svgW} ${volBarH}`}
                  className="w-full mt-0.5"
                  style={{ height: '28px' }}
                  aria-label={`${symbol} volume chart for ${timeframe}`}
                >
                  {points.map((p, i) => {
                    const barH = (p.volume / maxVolume) * volBarH * 0.9;
                    const barW = Math.max(2, (svgW / points.length) * 0.6);
                    const isHovered = hoveredPoint && Math.abs(hoveredPoint.x - p.x) < 4;
                    return (
                      <rect
                        key={i}
                        x={p.x - barW / 2}
                        y={volBarH - barH}
                        width={barW}
                        height={barH}
                        fill={isHovered ? strokeColor : 'var(--color-border-soft)'}
                        rx="1"
                      />
                    );
                  })}
                  <text x="4" y="10" fill="var(--color-faint)" fontSize="8" fontFamily="monospace">
                    VOL
                  </text>
                </svg>
              </div>
            </div>

            {/* ── Key metrics grid ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="region" aria-label="Key stock metrics">
              {[
                {
                  icon: <BarChart3 className="w-3.5 h-3.5 text-[var(--color-green)]" aria-hidden />,
                  label: '30D Volume Multiple',
                  value: `${stockDetail.volumeRatio ?? '—'}×`,
                  sub: `${((stockDetail.volume ?? 0) / 1_000_000).toFixed(1)}M shares today`,
                },
                {
                  icon: <TrendingUp className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden />,
                  label: '30D High',
                  value: `${currencySymbol(stockDetail.exchange)}${(stockDetail.high30d ?? 0).toLocaleString('en-IN')}`,
                  sub:
                    (stockDetail.currentPrice ?? 0) >= (stockDetail.high30d ?? 0)
                      ? 'Broken out ↑'
                      : `-${((((stockDetail.high30d ?? 0) - (stockDetail.currentPrice ?? 0)) / (stockDetail.high30d ?? 1)) * 100).toFixed(1)}% away`,
                },
                {
                  icon: <Zap className="w-3.5 h-3.5 text-[var(--color-amber)]" aria-hidden />,
                  label: 'Daily Volatility',
                  value: `±${stockDetail.volatilityPercent ?? '—'}%`,
                  sub: '30-day historical sigma',
                },
                {
                  icon: <Layers className="w-3.5 h-3.5 text-[var(--color-muted)]" aria-hidden />,
                  label: '52W High / Low',
                  value: `${currencySymbol(stockDetail.exchange)}${(stockDetail.high52w ?? 0).toLocaleString('en-IN')}`,
                  sub: `Low ${currencySymbol(stockDetail.exchange)}${(stockDetail.low52w ?? 0).toLocaleString('en-IN')} · ${stockDetail.marketCap ?? '—'}`,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)]"
                >
                  <span className="text-[10px] uppercase text-[var(--color-faint)] block mb-1.5">{m.label}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {m.icon}
                    <span className="font-mono text-base font-medium text-[var(--color-ink)] tabular-nums">
                      {m.value}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] mt-0.5 block font-normal">{m.sub}</span>
                </div>
              ))}
            </div>

            {/* ── Recent events for this stock ─────────────────────────────── */}
            {stockDetail.events && stockDetail.events.length > 0 && (
              <div className="space-y-2" role="region" aria-label="Recent events">
                <h3 className="text-[10px] uppercase tracking-normal text-[var(--color-faint)] font-medium">
                  Events & Intraday Signals
                </h3>
                <div className="space-y-1.5">
                  {stockDetail.events.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      className="p-4 rounded-2xl bg-[var(--color-panel)] border border-[var(--color-border-soft)] flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[11px] text-[var(--color-green)]">{e.timeFormatted}</span>
                          <span className="text-xs font-medium text-[var(--color-ink)]">{e.title}</span>
                        </div>
                        <p className="text-xs text-[var(--color-muted)] font-normal leading-relaxed">{e.explanation}</p>
                      </div>
                      <span
                        className={`font-mono text-xs font-medium px-2 py-0.5 rounded shrink-0 ${e.change.startsWith('+') ? 'bg-[var(--color-green-soft)] text-[var(--color-green)]' : 'bg-[var(--color-red-soft)] text-[var(--color-red)]'}`}
                      >
                        {e.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
