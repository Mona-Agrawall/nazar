/** Small request validators for the watchlist and session routes. Each returns a value or an error message. */

export const MAX_WATCHLIST_NAME_LENGTH = 50;
export const MAX_WATCHLIST_SYMBOLS = 100;
export const MAX_AWAY_SECONDS = 30 * 24 * 3600;
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.&_-]{0,19}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Check with `'error' in result`. */
type Result<T> = { value: T } | { error: string };
const ok = <T>(value: T): Result<T> => ({ value });
const fail = <T>(error: string): Result<T> => ({ error });

export function parseName(value: unknown): Result<string> {
  if (typeof value !== 'string' || !value.trim()) return fail('Watchlist name must be a non-empty string');
  return ok(value.trim().slice(0, MAX_WATCHLIST_NAME_LENGTH));
}

/** Upper-cases, de-duplicates and checks ticker symbols. */
export function parseSymbols(value: unknown): Result<string[]> {
  if (!Array.isArray(value)) return fail('symbols must be an array of ticker symbols');
  if (value.length > MAX_WATCHLIST_SYMBOLS)
    return fail(`A watchlist can hold at most ${MAX_WATCHLIST_SYMBOLS} symbols`);
  const symbols: string[] = [];
  for (const item of value) {
    const symbol = typeof item === 'string' ? item.trim().toUpperCase() : '';
    if (!SYMBOL_PATTERN.test(symbol)) return fail(`Invalid symbol: ${String(item).slice(0, 20)}`);
    if (!symbols.includes(symbol)) symbols.push(symbol);
  }
  return ok(symbols);
}

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** A single string query parameter (repeated parameters are rejected rather than crashing). */
export function queryString(value: unknown, maxLength: number): string | undefined {
  return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}
