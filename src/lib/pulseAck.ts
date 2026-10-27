import { MarketEvent } from '../types';

// Pulse cards represent stocks, while acknowledgements are stored per timeline event.

/** The (non-dismissed) timeline events behind a stock's pulse card. */
export function eventsForStock(events: MarketEvent[], symbol: string): MarketEvent[] {
  return events.filter((ev) => ev.stockSymbol === symbol && !ev.dismissed);
}

/** A card counts as acknowledged once every one of its stock's events is. */
export function isStockAcknowledged(events: MarketEvent[], symbol: string): boolean {
  const stockEvents = eventsForStock(events, symbol);
  return stockEvents.length > 0 && stockEvents.every((ev) => ev.acknowledged);
}

/** Event IDs to acknowledge when a card's button is pressed — never the stock symbol itself. */
export function eventIdsToAcknowledge(events: MarketEvent[], symbol: string): string[] {
  return eventsForStock(events, symbol)
    .filter((ev) => !ev.acknowledged)
    .map((ev) => ev.id);
}
