import { AttentionFactor } from '../../src/types.js';
import { BaseStockData } from '../data/stockUniverse.js';

export interface AttentionResult {
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: AttentionFactor[];
}

/**
 * Attention Scoring Engine: a deterministic, rule-based 0–100 score of how much a stock
 * deserves the user's attention. Starts at 20 and adds points for each signal found.
 */
export function calculateAttention(
  stock: BaseStockData,
  currentPrice: number,
  volume: number,
  openPrice: number,
  userPreviousPrice: number,
  awayDurationStr: string,
): AttentionResult {
  const factors: AttentionFactor[] = [];
  let score = 20; // baseline score

  const priceChangePct = ((currentPrice - stock.yesterdayClose) / stock.yesterdayClose) * 100;
  const absPriceChangePct = Math.abs(priceChangePct);
  const volumeRatio = volume / stock.avgVolume30d;
  const distanceTo30dHighPct = ((stock.high30d - currentPrice) / stock.high30d) * 100;
  const intradayFromOpenPct = ((currentPrice - openPrice) / openPrice) * 100;

  // 1. Abnormal volume factor
  if (volumeRatio >= 2.0) {
    const pts = Math.min(35, Math.round(volumeRatio * 14));
    score += pts;
    factors.push({
      id: 'vol_surge',
      label: `Volume ${volumeRatio.toFixed(1)}× normal`,
      points: pts,
      type: 'volume',
      description: `Trading at ${volumeRatio.toFixed(1)}× its 30-day average volume (${(volume / 1000000).toFixed(1)}M shares). Institutional interest indicated.`,
    });
  } else if (volumeRatio >= 1.4) {
    score += 15;
    factors.push({
      id: 'vol_elevated',
      label: `Elevated volume (${volumeRatio.toFixed(1)}×)`,
      points: 15,
      type: 'volume',
      description: `Volume is ${Math.round((volumeRatio - 1) * 100)}% above normal levels.`,
    });
  }

  // 2. Large price movement relative to historical volatility
  const volatilityMultiple = absPriceChangePct / (stock.volatilityPercent || 1.0);
  if (volatilityMultiple >= 2.5) {
    const pts = Math.min(30, Math.round(volatilityMultiple * 10));
    score += pts;
    factors.push({
      id: 'price_vol_shock',
      label: `${priceChangePct >= 0 ? '+' : ''}${priceChangePct.toFixed(1)}% vs ${stock.volatilityPercent}% normal vol`,
      points: pts,
      type: 'volatility',
      description: `Today's ${priceChangePct.toFixed(1)}% move is ${volatilityMultiple.toFixed(1)}× the stock's typical daily swing.`,
    });
  } else if (absPriceChangePct >= 1.5) {
    score += 15;
    factors.push({
      id: 'price_momentum',
      label: `${priceChangePct >= 0 ? '+' : ''}${priceChangePct.toFixed(1)}% price expansion`,
      points: 15,
      type: 'price',
      description: `Strong directional price momentum through key sessions.`,
    });
  }

  // 3. Resistance / 30-day high breakout
  if (currentPrice >= stock.high30d) {
    score += 28;
    factors.push({
      id: 'breakout_high',
      label: `Crossed 30-day high (₹${stock.high30d.toLocaleString('en-IN')})`,
      points: 28,
      type: 'breakout',
      description: `Clean technical breakout above the 30-day resistance level.`,
    });
  } else if (distanceTo30dHighPct > 0 && distanceTo30dHighPct <= 1.5) {
    score += 18;
    factors.push({
      id: 'near_high',
      label: `Within 1.5% of 30-day high`,
      points: 18,
      type: 'breakout',
      description: `Approaching critical multi-week resistance at ₹${stock.high30d.toLocaleString('en-IN')}.`,
    });
  }

  // 4. Intraday reversal / gap trap
  if (openPrice > stock.yesterdayClose * 1.008 && currentPrice < stock.yesterdayClose * 0.985) {
    score += 26;
    factors.push({
      id: 'gap_reversal',
      label: `Opened higher (+${(((openPrice - stock.yesterdayClose) / stock.yesterdayClose) * 100).toFixed(1)}%), collapsed ${intradayFromOpenPct.toFixed(1)}%`,
      points: 26,
      type: 'gap',
      description: `Intraday reversal trap: opened strong but heavy selling dragged it -${Math.abs(priceChangePct).toFixed(1)}% below close.`,
    });
  }

  // 5. Meaningful change since user's last session
  if (userPreviousPrice > 0) {
    const userDeltaPct = ((currentPrice - userPreviousPrice) / userPreviousPrice) * 100;
    if (Math.abs(userDeltaPct) >= 2.5) {
      score += 16;
      factors.push({
        id: 'user_delta',
        label: `${userDeltaPct >= 0 ? '+' : ''}${userDeltaPct.toFixed(1)}% since your last visit`,
        points: 16,
        type: 'price',
        description: `Price moved ₹${Math.abs(currentPrice - userPreviousPrice).toFixed(1)} since you checked ${awayDurationStr} ago.`,
      });
    }
  }

  // Cap score at 98 for realism
  score = Math.min(98, Math.max(12, score));
  const level = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';

  return { score, level, factors };
}
