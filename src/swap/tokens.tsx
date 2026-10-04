export type Token = {
  symbol: string;
  name: string;
  /* USD price, used to quote every pair */
  price: number;
  /* 24h change shown next to the dollar value */
  change: number;
  color: string;
};

export const tokens: Token[] = [
  { symbol: "USDT", name: "Tether USD", price: 1, change: -0.45, color: "#26a17b" },
  { symbol: "ETH", name: "Ethereum", price: 3260.2, change: -0.45, color: "#627eea" },
  { symbol: "USDC", name: "USD Coin", price: 1, change: 0.01, color: "#2775ca" },
  { symbol: "BTC", name: "Bitcoin", price: 67420, change: 1.12, color: "#f7931a" },
  { symbol: "DAI", name: "Dai", price: 1, change: -0.02, color: "#f5ac37" },
  { symbol: "USD", name: "US Dollar", price: 1, change: 0, color: "#1f9d55" },
  { symbol: "stETH", name: "Lido Staked ETH", price: 3255.4, change: -0.51, color: "#00a3ff" },
];

export const bySymbol = (symbol: string) => tokens.find((t) => t.symbol === symbol)!;

export const initialBalances: Record<string, number> = {
  USDT: 4537.5,
  ETH: 0,
  USDC: 1250,
  BTC: 0,
  DAI: 0,
  USD: 10000,
  stETH: 0,
};

/* round coin marks drawn inline so nothing has to load */
export function TokenIcon({ token, size = 22 }: { token: Token; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <circle cx="16" cy="16" r="16" fill={token.color} />
      <Glyph symbol={token.symbol} />
    </svg>
  );
}

function Glyph({ symbol }: { symbol: string }) {
  switch (symbol) {
    case "USDT":
      return (
        <g fill="#fff">
          <path d="M8.5 8.6h15v3.3h-5.6v11.6h-3.8V11.9H8.5z" />
          <ellipse cx="16" cy="15.4" rx="7.4" ry="1.9" fill="none" stroke="#fff" strokeWidth="1.5" />
        </g>
      );
    case "ETH":
    case "stETH":
      return (
        <g fill="#fff">
          <path d="M16 5.5v7.8l6.6 2.9z" fillOpacity=".6" />
          <path d="M16 5.5 9.4 16.2l6.6-2.9z" />
          <path d="M16 21.3v5.2l6.6-9.2z" fillOpacity=".6" />
          <path d="M16 26.5v-5.2l-6.6-4z" />
          <path d="M16 20.1l6.6-3.9L16 13.3z" fillOpacity=".2" />
          <path d="M9.4 16.2l6.6 3.9v-6.8z" fillOpacity=".6" />
        </g>
      );
    case "BTC":
      return (
        <text x="16" y="22" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="system-ui">
          ₿
        </text>
      );
    case "DAI":
      return (
        <text x="16" y="21.5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="system-ui">
          D
        </text>
      );
    default:
      return (
        <text x="16" y="22" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="system-ui">
          $
        </text>
      );
  }
}
