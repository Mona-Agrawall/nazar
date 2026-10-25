import React from 'react';
import { MarketIndex } from '../types';
import { Sparkline } from './Sparkline';

interface MarketIndicesBarProps {
  indices: MarketIndex[];
}

export const MarketIndicesBar: React.FC<MarketIndicesBarProps> = ({ indices }) => {
  if (!indices || indices.length === 0) return null;

  return (
    <div className="w-full border-b border-[var(--color-border)] bg-[var(--color-background)] overflow-x-auto py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-w-max">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-normal text-[var(--color-muted)] font-medium mr-2">
          <span>Indices</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 flex-1 justify-between">
          {indices.map((idx) => {
            const isPos = idx.change >= 0;
            return (
              <div
                key={idx.symbol}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[var(--color-panel)] hover:bg-[var(--color-background)] border border-[var(--color-border-soft)] hover:border-[var(--color-border)] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-ink)] ">{idx.name}</span>
                    <span className="text-[11px] font-mono text-[var(--color-muted)]">
                      ₹{idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                    <span className={isPos ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}>
                      {isPos ? '+' : ''}
                      {idx.change.toFixed(2)} ({isPos ? '+' : ''}
                      {idx.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block">
                  <Sparkline data={idx.sparkline} width={56} height={20} isPositive={isPos} strokeWidth={1.5} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
