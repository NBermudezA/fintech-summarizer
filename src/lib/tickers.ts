export type TickerCategory = "stock" | "crypto";

export interface PopularTicker {
  symbol: string;
  name: string;
  category: TickerCategory;
  /** Other names the press uses, for matching headlines to the ticker. */
  aliases?: string[];
}

export const POPULAR_TICKERS: PopularTicker[] = [
  { symbol: "AAPL", name: "Apple", category: "stock" },
  { symbol: "MSFT", name: "Microsoft", category: "stock" },
  { symbol: "GOOGL", name: "Alphabet (Google)", category: "stock", aliases: ["Alphabet", "Google"] },
  { symbol: "AMZN", name: "Amazon", category: "stock" },
  { symbol: "NVDA", name: "NVIDIA", category: "stock" },
  { symbol: "META", name: "Meta Platforms", category: "stock", aliases: ["Meta", "Facebook"] },
  { symbol: "TSLA", name: "Tesla", category: "stock" },
  { symbol: "JPM", name: "JPMorgan Chase", category: "stock", aliases: ["JPMorgan", "JP Morgan"] },
  { symbol: "NFLX", name: "Netflix", category: "stock" },
  { symbol: "BTC", name: "Bitcoin", category: "crypto" },
  { symbol: "ETH", name: "Ethereum", category: "crypto" },
  { symbol: "SOL", name: "Solana", category: "crypto" },
  { symbol: "XRP", name: "XRP", category: "crypto" },
  { symbol: "DOGE", name: "Dogecoin", category: "crypto" },
];
