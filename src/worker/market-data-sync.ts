import { fetchAndStoreCandles } from "@/modules/market-data/fetch-and-store-candles";

export type MarketDataSyncResult = {
  processedCandles: number;
};

export type MarketDataSyncOptions = {
  intervalMs?: number;
  sync?: () => Promise<MarketDataSyncResult>;
};

export type MarketDataSyncHandle = {
  stop: () => void;
};

const DEFAULT_MARKET_DATA_SYNC_INTERVAL_MS = 60_000;

/**
 * 统一解析行情同步间隔，优先使用显式传参，其次读取环境变量，最后回退到默认值。
 */
function resolveMarketDataSyncIntervalMs(intervalMs?: number) {
  if (typeof intervalMs === "number" && Number.isFinite(intervalMs) && intervalMs > 0) {
    return intervalMs;
  }

  const configuredIntervalMs = Number(process.env.MARKET_DATA_SYNC_INTERVAL_MS);

  if (Number.isFinite(configuredIntervalMs) && configuredIntervalMs > 0) {
    return configuredIntervalMs;
  }

  return DEFAULT_MARKET_DATA_SYNC_INTERVAL_MS;
}

/**
 * 启动独立的行情同步循环，避免把市场数据刷新混入现有 Job 队列统计。
 */
export function startMarketDataSyncLoop(options: MarketDataSyncOptions = {}): MarketDataSyncHandle {
  const sync = options.sync ?? (() => fetchAndStoreCandles());
  const intervalMs = resolveMarketDataSyncIntervalMs(options.intervalMs);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 停止时需要清掉挂起定时器，避免 worker 退出或测试结束后残留下一轮 tick。
   */
  const stop = () => {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  /**
   * 每轮执行结束后统一安排下一次同步，保证失败时也会继续调度。
   */
  const scheduleNextTick = () => {
    if (stopped) {
      return;
    }

    timer = setTimeout(() => {
      void tick();
    }, intervalMs);
  };

  /**
   * 启动后立即同步一次，随后按照固定间隔持续刷新 Binance 合约 K 线。
   */
  const tick = async () => {
    if (stopped) {
      return;
    }

    try {
      await sync();
    } catch (error) {
      console.error("Market data sync failed.", error);
    } finally {
      scheduleNextTick();
    }
  };

  void tick();

  return { stop };
}
