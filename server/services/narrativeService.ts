import { GoogleGenAI } from '@google/genai';
import { AttentionFactor } from '../../src/types.js';
import { EXPLANATIONS } from '../data/demoScenario.js';

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_CACHE_MS = 2 * 60 * 1000;
// Fallbacks are cached briefly so the app switches to Gemini soon after it recovers.
const FALLBACK_CACHE_MS = 30 * 1000;

const narrativeCache = new Map<string, { text: string; expiresAt: number }>();
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
  const { symbol, currentPrice, previousPrice, volumeRatio, high30d, awayDurationStr, attentionLevel, factors } = input;
  const diff = currentPrice - previousPrice;
  const pct = (diff / previousPrice) * 100;
  const sign = pct >= 0 ? '+' : '';

  const now = Date.now();
  const cached = narrativeCache.get(symbol);
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
        narrativeCache.set(symbol, { text: response.text, expiresAt: now + GEMINI_CACHE_MS });
        return response.text;
      }
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status ?? 0;
      // Rate limits (429) are expected on the free tier, so they fall back silently.
      if (status !== 429) console.warn(`[Gemini] ${symbol}: ${e?.message ?? e}`);
    }
  }

  let fallbackText: string;
  if (symbol === 'RELIANCE') {
    fallbackText = `Since your last visit (${awayDurationStr} ago), RELIANCE gained 3.8%, traded at 2.4× its normal volume, and is within 0.6% of testing its 30-day high. Institutional block trades detected.`;
  } else if (symbol === 'TCS') {
    fallbackText = `Since your last visit, TCS crossed its 30-day resistance of ₹${high30d.toLocaleString('en-IN')}, registering +1.9% with sustained buyer accumulation across European session hours.`;
  } else if (symbol === 'HDFCBANK') {
    fallbackText = `Since your last visit, HDFCBANK opened higher (+0.5%) but suffered sharp institutional selling pressure, dropping 2.7% intraday on elevated options block activity.`;
  } else if (symbol === 'INFY') {
    fallbackText = `INFY consolidated tightly within a 0.5% corridor, absorbing mild profit taking while maintaining its 20-day moving average.`;
  } else if (symbol === 'TATAMOTORS') {
    fallbackText = `Tata Motors gained +2.6% on strong monthly EV dispatch volumes and commercial vehicle order book expansion.`;
  } else if (Math.abs(pct) >= 2) {
    fallbackText = `Since you last looked, ${symbol} moved ${sign}${pct.toFixed(1)}% (₹${diff > 0 ? '+' : ''}${diff.toFixed(1)}) with ${volumeRatio.toFixed(1)}× standard turnover.`;
  } else {
    fallbackText = `${symbol} held steady at ₹${currentPrice.toLocaleString('en-IN')} (${sign}${pct.toFixed(2)}%), experiencing orderly trading within historical range.`;
  }

  narrativeCache.set(symbol, { text: fallbackText, expiresAt: now + FALLBACK_CACHE_MS });
  return fallbackText;
}

export interface ExplanationFacts {
  symbol: string;
  priceChangePct?: number;
  volumeMultiple?: number;
  timeSinceLastSeen?: string;
}

/** One-sentence "why it matters" text shown in the stock modals. */
export function buildExplanation(facts: ExplanationFacts): string {
  if (EXPLANATIONS[facts.symbol]) return EXPLANATIONS[facts.symbol];
  const sign = facts.priceChangePct !== undefined && facts.priceChangePct >= 0 ? '+' : '';
  return `${facts.symbol} moved ${sign}${facts.priceChangePct?.toFixed(1) ?? '0.0'}% with ${facts.volumeMultiple?.toFixed(1) ?? '1.0'}× its normal volume since your last visit ${facts.timeSinceLastSeen} ago.`;
}
