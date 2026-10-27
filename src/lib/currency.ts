/** Currency symbol for a listing's exchange: US exchanges quote in dollars, the rest of this app's universe in rupees. */
export function currencySymbol(exchange: string): string {
  return exchange === 'NASDAQ' || exchange === 'NYSE' ? '$' : '₹';
}

/** Price with Indian digit grouping and a fixed number of decimals, e.g. 4128.5 → "4,128.50". */
export function formatPrice(value: number, decimals = 2): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
