import { MarketEvent, MarketIndex, Watchlist } from '../../src/types.js';

/**
 * The canonical demo scenario: the user was away for 7h 42m, during which
 * RELIANCE surged on volume, TCS broke out and HDFCBANK reversed intraday.
 */
export const DEMO_AWAY_SECONDS = 7 * 3600 + 42 * 60;

const DAY_MS = 86_400_000;

export function createDemoWatchlists(): Watchlist[] {
  const now = Date.now();
  return [
    {
      id: 'wl_default',
      name: 'Primary Watchlist',
      symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'TATAMOTORS', 'AAPL', 'MSFT'],
      isDefault: true,
      createdAt: now - DAY_MS * 14,
      updatedAt: now,
    },
    {
      id: 'wl_tech',
      name: 'Tech & Digital',
      symbols: ['TCS', 'INFY', 'BHARTIARTL'],
      isDefault: false,
      createdAt: now - DAY_MS * 7,
      updatedAt: now,
    },
    {
      id: 'wl_banks',
      name: 'Indian Banks',
      symbols: ['HDFCBANK', 'ICICIBANK', 'SBIN'],
      isDefault: false,
      createdAt: now - DAY_MS * 5,
      updatedAt: now,
    },
    {
      id: 'wl_heavyweights',
      name: 'Bluechips & Infra',
      symbols: ['RELIANCE', 'LT', 'ITC', 'TITAN', 'BAJFINANCE'],
      isDefault: false,
      createdAt: now - DAY_MS * 3,
      updatedAt: now,
    },
  ];
}

export const MARKET_INDICES: MarketIndex[] = [
  {
    symbol: 'NIFTY50',
    name: 'NIFTY 50',
    value: 25142.3,
    change: 148.6,
    changePercent: 0.6,
    high: 25198.4,
    low: 24980.1,
    sparkline: [24985, 25010, 25040, 25015, 25080, 25110, 25095, 25130, 25142.3],
  },
  {
    symbol: 'SENSEX',
    name: 'BSE SENSEX',
    value: 82365.75,
    change: 492.2,
    changePercent: 0.6,
    high: 82510.0,
    low: 81850.5,
    sparkline: [81860, 81950, 82050, 82010, 82180, 82290, 82240, 82320, 82365.75],
  },
  {
    symbol: 'BANKNIFTY',
    name: 'NIFTY BANK',
    value: 51840.1,
    change: -185.4,
    changePercent: -0.36,
    high: 52210.0,
    low: 51720.0,
    sparkline: [52150, 52190, 52050, 51920, 51890, 51780, 51740, 51810, 51840.1],
  },
  {
    symbol: 'GIFTNIFTY',
    name: 'GIFT NIFTY',
    value: 25210.0,
    change: 85.0,
    changePercent: 0.34,
    high: 25245.0,
    low: 25110.0,
    sparkline: [25120, 25140, 25160, 25180, 25190, 25200, 25210],
  },
];

/** A timeline event, positioned by seconds elapsed since the user left. */
export type EventTemplate = Omit<MarketEvent, 'timestamp' | 'timeFormatted' | 'dismissed' | 'acknowledged'> & {
  offsetSeconds: number;
};

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'evt_rel_1',
    offsetSeconds: 2800,
    stockSymbol: 'RELIANCE',
    stockName: 'Reliance Industries',
    title: 'Breakout Above +3.0%',
    change: '+3.8%',
    changeType: 'price_up',
    importance: 'critical',
    explanation:
      'RELIANCE surged past ₹2,410 on 2.4× 30-day average volume, driven by retail & petrochemical margin expansion rumors.',
    miniChart: [2342, 2350, 2368, 2390, 2415, 2431],
  },
  {
    id: 'evt_tcs_1',
    offsetSeconds: 4800,
    stockSymbol: 'TCS',
    stockName: 'Tata Consultancy Services',
    title: 'Crossed 30-day High Resistance',
    change: '+1.9%',
    changeType: 'breakout_high',
    importance: 'high',
    explanation:
      'Broke clean through ₹4,110 multi-week ceiling with strong European market open buy orders and zero intraday pullback.',
    miniChart: [4050, 4065, 4080, 4105, 4118, 4128],
  },
  {
    id: 'evt_hdfc_1',
    offsetSeconds: 7600,
    stockSymbol: 'HDFCBANK',
    stockName: 'HDFC Bank',
    title: 'Intraday Reversal & Volume Spike',
    change: '-2.7%',
    changeType: 'price_down',
    importance: 'critical',
    explanation:
      'Gap-up to ₹1,695 was forcefully rejected; aggressive institutional selling dumped 14.5M shares down to ₹1,642 support.',
    miniChart: [1695, 1682, 1668, 1655, 1640, 1642],
  },
  {
    id: 'evt_infy_1',
    offsetSeconds: 13500,
    stockSymbol: 'INFY',
    stockName: 'Infosys Ltd',
    title: 'Volatility Contraction to Normal Range',
    change: '-0.3%',
    changeType: 'range_recovery',
    importance: 'medium',
    explanation:
      'Morning spread tightened from 1.8% to 0.4%; options implied volatility cooled down back into normal 30-day band.',
    miniChart: [1792, 1788, 1782, 1784, 1786, 1785],
  },
  {
    id: 'evt_tata_1',
    offsetSeconds: 18200,
    stockSymbol: 'TATAMOTORS',
    stockName: 'Tata Motors',
    title: 'Automotive EV Delivery Surge',
    change: '+2.6%',
    changeType: 'price_up',
    importance: 'high',
    explanation:
      'Monthly electric vehicle delivery numbers beat consensus by 14%; share price pushed through ₹980 psychological barrier.',
    miniChart: [960, 965, 972, 976, 982, 985],
  },
  {
    id: 'evt_bharti_1',
    offsetSeconds: 22400,
    stockSymbol: 'BHARTIARTL',
    stockName: 'Bharti Airtel',
    title: 'ARPU Guidance Upgrade',
    change: '+1.7%',
    changeType: 'breakout_high',
    importance: 'medium',
    explanation:
      'Brokerage note lifted average revenue per user target to ₹230, lifting telecommunications sector sentiment.',
    miniChart: [1595, 1602, 1610, 1618, 1622, 1623],
  },
];
