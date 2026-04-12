import type { CandleTimeframe, RawCandle } from "@/modules/market-data/normalize-candles";
import { createProxyAwareFetch } from "@/modules/market-data/proxy-aware-fetch";

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type BinanceKlinePayload = ReadonlyArray<BinanceKline>;

export type BinanceFuturesClient = {
  fetchCandles(symbol: string, timeframe: CandleTimeframe): Promise<ReadonlyArray<RawCandle>>;
};

const DEFAULT_BINANCE_FUTURES_BASE_URL = "https://fapi.binance.com";

// 允许通过环境变量覆盖 Binance 基础地址，方便本地调试或后续切换代理。
function getBinanceFuturesKlineUrl() {
  const baseUrl = process.env.BINANCE_FUTURES_BASE_URL?.trim() || DEFAULT_BINANCE_FUTURES_BASE_URL;

  return new URL("/fapi/v1/klines", baseUrl);
}

// 统一把业务侧的 BTC/ETH 符号转换成 Binance USDⓈ-M 合约符号。
function toFuturesSymbol(symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  return normalizedSymbol.endsWith("USDT") ? normalizedSymbol : `${normalizedSymbol}USDT`;
}

// 解析 Binance 返回的字符串数值，避免把非法数据悄悄写进数据库。
function parseFiniteNumber(value: string | number, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid Binance futures candle ${field}`);
  }

  return parsed;
}

// 把 Binance 的数组元组转换成项目内部统一的原始 K 线结构。
function parseBinanceKlineRow(row: unknown): RawCandle {
  if (!Array.isArray(row) || row.length < 6) {
    throw new Error("invalid Binance futures candle row");
  }

  const [openTime, open, high, low, close, volume] = row as BinanceKline;

  return {
    openTime: parseFiniteNumber(openTime, "openTime"),
    open: parseFiniteNumber(open, "open"),
    high: parseFiniteNumber(high, "high"),
    low: parseFiniteNumber(low, "low"),
    close: parseFiniteNumber(close, "close"),
    volume: parseFiniteNumber(volume, "volume"),
  };
}

// 第一阶段直接丢掉最新一根，确保只把已收盘 K 线送进后续链路。
function dropNewestCandle(candles: ReadonlyArray<RawCandle>) {
  return candles.length <= 1 ? [] : candles.slice(0, -1);
}

// 创建 Binance USDⓈ-M 合约客户端，统一负责请求、校验和闭合 bar 过滤。
export function createBinanceFuturesClient(
  fetchImpl: typeof fetch = createProxyAwareFetch()
): BinanceFuturesClient {
  return {
    async fetchCandles(symbol, timeframe) {
      const url = getBinanceFuturesKlineUrl();
      url.searchParams.set("symbol", toFuturesSymbol(symbol));
      url.searchParams.set("interval", timeframe);
      url.searchParams.set("limit", "500");

      const response = await fetchImpl(url);

      if (!response.ok) {
        const reason = await response.text().catch(() => "");

        throw new Error(
          `failed to fetch Binance futures candles for ${symbol} ${timeframe} (${response.status})${reason ? `: ${reason}` : ""}`
        );
      }

      const payload = (await response.json()) as unknown;

      if (!Array.isArray(payload)) {
        throw new Error("invalid Binance futures candles payload");
      }

      const parsedCandles = (payload as BinanceKlinePayload).map(parseBinanceKlineRow);

      return dropNewestCandle(parsedCandles);
    },
  };
}
