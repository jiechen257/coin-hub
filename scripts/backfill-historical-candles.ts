import "dotenv/config";

import { backfillHistoricalCandles } from "@/modules/market-data/backfill-historical-candles";

// CLI 只负责触发回填并输出摘要，具体计划生成和写库逻辑留在领域模块里。
async function main() {
  const startedAt = Date.now();
  const result = await backfillHistoricalCandles();
  const durationMs = Date.now() - startedAt;

  console.log(
    JSON.stringify(
      {
        status: "ok",
        processedCandles: result.processedCandles,
        downloadedArchives: result.downloadedArchives,
        skippedArchives: result.skippedArchives,
        durationMs,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
