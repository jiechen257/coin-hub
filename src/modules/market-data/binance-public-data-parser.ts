import { strFromU8, unzipSync } from "fflate";
import type { RawCandle } from "@/modules/market-data/normalize-candles";

// 解析 Binance CSV 中的数值字段，避免把损坏归档静默写入数据库。
function parseFiniteNumber(value: string, field: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid binance public-data candle ${field}`);
  }

  return parsed;
}

// 单行 CSV 映射成项目统一的原始 K 线结构，只保留 OHLCV 主字段。
function parseCsvLine(line: string): RawCandle {
  const columns = line.split(",");

  if (columns.length < 6) {
    throw new Error("invalid binance public-data csv row");
  }

  return {
    openTime: parseFiniteNumber(columns[0], "openTime"),
    open: parseFiniteNumber(columns[1], "open"),
    high: parseFiniteNumber(columns[2], "high"),
    low: parseFiniteNumber(columns[3], "low"),
    close: parseFiniteNumber(columns[4], "close"),
    volume: parseFiniteNumber(columns[5], "volume"),
  };
}

// Binance 新版 public-data CSV 带 header，这里在解析前统一过滤，避免把字段名当成数值。
function isHeaderLine(line: string) {
  return line.toLowerCase().startsWith("open_time,");
}

// 从 zip 内选择唯一的 CSV 文件，Binance public-data 的 kline 归档就是这种单文件结构。
function readCsvFromArchive(bytes: Uint8Array) {
  const entries = unzipSync(bytes);
  const csvEntry = Object.entries(entries).find(([name]) => name.endsWith(".csv"));

  if (!csvEntry) {
    throw new Error("binance public-data archive does not contain a csv file");
  }

  return strFromU8(csvEntry[1]);
}

// 解压 Binance public-data zip 并解析成 RawCandle[]，供后续 normalize + store 复用。
export function parseBinancePublicDataArchive(archive: ArrayBuffer | Uint8Array): RawCandle[] {
  const bytes = archive instanceof Uint8Array ? archive : new Uint8Array(archive);
  const csv = readCsvFromArchive(bytes);

  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isHeaderLine(line))
    .map(parseCsvLine);
}
