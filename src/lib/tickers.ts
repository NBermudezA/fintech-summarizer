export type TickerCategory = "stock" | "crypto";

export interface PopularTicker {
  symbol: string;
  name: string;
  category: TickerCategory;
}

export const POPULAR_TICKERS: PopularTicker[] = [
  { symbol: "AAPL", name: "Apple", category: "stock" },
  { symbol: "MSFT", name: "Microsoft", category: "stock" },
  { symbol: "GOOGL", name: "Alphabet (Google)", category: "stock" },
  { symbol: "AMZN", name: "Amazon", category: "stock" },
  { symbol: "NVDA", name: "NVIDIA", category: "stock" },
  { symbol: "META", name: "Meta Platforms", category: "stock" },
  { symbol: "TSLA", name: "Tesla", category: "stock" },
  { symbol: "JPM", name: "JPMorgan Chase", category: "stock" },
  { symbol: "NFLX", name: "Netflix", category: "stock" },
  { symbol: "BTC", name: "Bitcoin", category: "crypto" },
  { symbol: "ETH", name: "Ethereum", category: "crypto" },
  { symbol: "SOL", name: "Solana", category: "crypto" },
];
