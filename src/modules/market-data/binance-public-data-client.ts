import type { CandleTimeframe } from "@/modules/market-data/normalize-candles";
import { createProxyAwareFetch } from "@/modules/market-data/proxy-aware-fetch";

export type ArchivePeriod = "daily" | "monthly";

export type BinancePublicDataArchiveSpec = {
  symbol: string;
  marketSymbol: string;
  timeframe: CandleTimeframe;
  period: ArchivePeriod;
  dateKey: string;
  path: string;
};

export type BinancePublicDataClient = {
  fetchArchive(spec: BinancePublicDataArchiveSpec): Promise<ArrayBuffer | null>;
};

const DEFAULT_BINANCE_PUBLIC_DATA_BASE_URL = "https://data.binance.vision";

// 允许通过环境变量覆盖历史归档地址，方便后续接镜像源或本地缓存。
function getBinancePublicDataBaseUrl() {
  return process.env.BINANCE_PUBLIC_DATA_BASE_URL?.trim() || DEFAULT_BINANCE_PUBLIC_DATA_BASE_URL;
}

// Binance public-data 归档路径按固定目录结构组织，这里统一生成完整下载 URL。
export function buildBinancePublicDataArchiveUrl(spec: BinancePublicDataArchiveSpec) {
  return new URL(spec.path, getBinancePublicDataBaseUrl());
}

// 创建历史归档下载客户端，404 视为缺文件可跳过，其他错误直接上抛。
export function createBinancePublicDataClient(
  fetchImpl: typeof fetch = createProxyAwareFetch()
): BinancePublicDataClient {
  return {
    async fetchArchive(spec) {
      const response = await fetchImpl(buildBinancePublicDataArchiveUrl(spec));

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const reason = await response.text().catch(() => "");

        throw new Error(
          `failed to fetch Binance public-data archive ${spec.path} (${response.status})${reason ? `: ${reason}` : ""}`
        );
      }

      return response.arrayBuffer();
    },
  };
}
