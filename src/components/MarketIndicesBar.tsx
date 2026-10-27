import React from 'react';
import { MarketIndex } from '../types';
import { Sparkline } from './Sparkline';

interface MarketIndicesBarProps {
  indices: MarketIndex[];
}

export const MarketIndicesBar: React.FC<MarketIndicesBarProps> = ({ indices }) => {
  if (!indices || indices.length === 0) return null;

  return (
    <div className="w-full border-b border-[var(--color-border)] bg-[var(--color-background)] overflow-x-auto py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-max lg:min-w-0" aria-label="Market indices">
        <div className="grid grid-cols-4 gap-4">
          {indices.map((idx) => {
            const isPos = idx.change >= 0;
            return (
              <div
                key={idx.symbol}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-[var(--color-border)]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--color-ink)] whitespace-nowrap">{idx.name}</div>
                  <div className="text-base font-mono font-medium text-[var(--color-ink)] mt-0.5 whitespace-nowrap">
                    {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-mono whitespace-nowrap">
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
