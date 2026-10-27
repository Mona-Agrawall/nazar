/** Currency symbol for a listing's exchange: US exchanges quote in dollars, the rest of this app's universe in rupees. */
export function currencySymbol(exchange: string): string {
  return exchange === 'NASDAQ' || exchange === 'NYSE' ? '$' : '₹';
}
