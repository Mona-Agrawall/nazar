import { GoogleGenAI } from '@google/genai';
import { AttentionFactor } from '../../src/types.js';

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_CACHE_MS = 2 * 60 * 1000;
// Fallbacks are cached briefly so the app switches to Gemini soon after it recovers.
const FALLBACK_CACHE_MS = 30 * 1000;

// Keyed by every input the text depends on, so sessions with different baselines or away times
// never see each other's narrative, while identical inputs still share one Gemini call.
const narrativeCache = new Map<string, { text: string; expiresAt: number }>();
const MAX_CACHE_ENTRIES = 500;

function cacheNarrative(key: string, text: string, expiresAt: number) {
  if (narrativeCache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of narrativeCache) if (v.expiresAt <= now) narrativeCache.delete(k);
    if (narrativeCache.size >= MAX_CACHE_ENTRIES) narrativeCache.delete(narrativeCache.keys().next().value as string);
  }
  narrativeCache.set(key, { text, expiresAt });
}
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return geminiClient;
}

export interface NarrativeInput {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  volumeRatio: number;
  high30d: number;
  awayDurationStr: string;
  attentionLevel: 'high' | 'medium' | 'low';
  factors: AttentionFactor[];
}

/**
 * Explains what changed for a stock since the user's last visit.
 * Gemini only rephrases pre-computed facts and is used for high-attention stocks only
 * (to save quota); every other case gets a deterministic narrative.
 */
export async function buildStockNarrative(input: NarrativeInput): Promise<string> {
  const { symbol, currentPrice, previousPrice, volumeRatio, attentionLevel, factors } = input;
  const diff = currentPrice - previousPrice;
  const pct = (diff / previousPrice) * 100;
  const sign = pct >= 0 ? '+' : '';

  const now = Date.now();
  const cacheKey = [symbol, previousPrice, currentPrice, volumeRatio, input.awayDurationStr, attentionLevel].join('|');
  const cached = narrativeCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.text;

  const useGemini = process.env.GEMINI_API_KEY && attentionLevel === 'high' && process.env.GEMINI_ENABLED !== 'false';

  if (useGemini) {
    try {
      const prompt = `You are a sophisticated, professional financial analyst. I need a 1-2 sentence market update for the stock "${symbol}".

        Current Price: ${currentPrice}
        Percent Change: ${sign}${pct.toFixed(1)}%
        Volume compared to normal: ${volumeRatio.toFixed(1)}x
        Notable Factors detected: ${factors.map((f) => f.label).join(', ')}

        Describe this price action concisely.
        Tone: Premium, objective, quiet, high-information, editorial.
        Rules:
        1. DO NOT offer financial advice.
        2. DO NOT perform math calculations, rely on the data provided.
        3. Never output more than 2 sentences.
        4. Focus on the 'why' and 'what it means' based on the factors provided.`;

      const response = await getGeminiClient().models.generateContent({ model: GEMINI_MODEL, contents: prompt });
      if (response.text) {
        cacheNarrative(cacheKey, response.text, now + GEMINI_CACHE_MS);
        return response.text;
      }
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status ?? 0;
      // Rate limits (429) are expected on the free tier, so they fall back silently.
      if (status !== 429) console.warn(`[Gemini] ${symbol}: ${e?.message ?? e}`);
    }
  }

  const fallbackText = describeChange(input, pct);

  cacheNarrative(cacheKey, fallbackText, now + FALLBACK_CACHE_MS);
  return fallbackText;
}

/** Deterministic narrative built only from the computed numbers and attention factors. */
function describeChange(input: NarrativeInput, pct: number): string {
  const { symbol, currentPrice, volumeRatio, high30d, awayDurationStr, factors } = input;
  const price = currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const since = awayDurationStr === '0s' ? 'Since you last checked' : `Since your last visit (${awayDurationStr} ago)`;

  if (Math.abs(pct) < 0.05) {
    return `${since}, ${symbol} is essentially unchanged at ${price}.`;
  }

  const details: string[] = [];
  if (volumeRatio >= 1.4) details.push(`on ${volumeRatio.toFixed(1)}× its normal volume`);
  const has = (id: string) => factors.some((f) => f.id === id);
  if (has('breakout_high')) details.push(`trading above its 30-day high of ${high30d.toLocaleString('en-IN')}`);
  else if (has('near_high')) details.push(`within 1.5% of its 30-day high`);
  if (has('gap_reversal')) details.push(`after reversing from a higher open`);

  const move = `${pct > 0 ? 'rose' : 'fell'} ${Math.abs(pct).toFixed(1)}% to ${price}`;
  return `${since}, ${symbol} ${move}${details.length ? ', ' + details.join(', ') : ''}.`;
}

export interface ExplanationFacts {
  symbol: string;
  priceChangePct?: number;
  volumeMultiple?: number;
  timeSinceLastSeen?: string;
}

/** One-sentence "why it matters" text shown in the stock modals. */
export function buildExplanation(facts: ExplanationFacts): string {
  const pct = Number(facts.priceChangePct) || 0;
  const volume = Number(facts.volumeMultiple) || 1;
  const since =
    facts.timeSinceLastSeen && facts.timeSinceLastSeen !== '0s'
      ? `since your last visit ${facts.timeSinceLastSeen} ago`
      : 'since you last checked';
  if (Math.abs(pct) < 0.05) {
    return `${facts.symbol} is essentially unchanged ${since}, trading at ${volume.toFixed(1)}× its normal volume.`;
  }
  const sign = pct >= 0 ? '+' : '';
  return `${facts.symbol} moved ${sign}${pct.toFixed(1)}% with ${volume.toFixed(1)}× its normal volume ${since}.`;
}
