import { execFileSync } from "node:child_process";

const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL ?? "http://127.0.0.1:3000";
const PRODUCTION_BASE_URL =
  process.env.PRODUCTION_BASE_URL ?? "https://coin-hub-murex.vercel.app";
const TARGET_TRADER_NAME = process.env.TRADER_NAME ?? "简简";

function createRecordSignature(record) {
  return `${record.startedAt}::${record.rawContent}`;
}

function buildCreateRecordPayload(record, traderId) {
  return {
    traderId,
    symbol: record.symbol,
    recordType: record.recordType,
    sourceType: record.sourceType,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    morphology: record.morphology ?? undefined,
    rawContent: record.rawContent,
    notes: record.notes ?? undefined,
    plans: record.executionPlans.map((plan) => ({
      label: plan.label,
      side: plan.side,
      entryPrice: plan.entryPrice ?? undefined,
      exitPrice: plan.exitPrice ?? undefined,
      stopLoss: plan.stopLoss ?? undefined,
      takeProfit: plan.takeProfit ?? undefined,
      marketContext: plan.marketContext ?? undefined,
      triggerText: plan.triggerText,
      entryText: plan.entryText,
      riskText: plan.riskText ?? undefined,
      exitText: plan.exitText ?? undefined,
      notes: plan.notes ?? undefined,
    })),
  };
}

function readJson(url, init = {}) {
  const method = init.method ?? "GET";
  const headers = init.headers ?? {};
  const body = init.body;
  const curlArgs = ["-sS", "-X", method];

  for (const [key, value] of Object.entries(headers)) {
    curlArgs.push("-H", `${key}: ${value}`);
  }

  if (body) {
    curlArgs.push("--data-raw", body);
  }

  curlArgs.push(url);

  try {
    const output = execFileSync("curl", curlArgs, {
      encoding: "utf8",
    });

    return output ? JSON.parse(output) : {};
  } catch (error) {
    throw new Error(
      error instanceof Error ? `curl ${method} ${url} 失败: ${error.message}` : String(error),
    );
  }
}

function ensureProductionTrader() {
  const tradersPayload = readJson(`${PRODUCTION_BASE_URL}/api/traders`);
  const existingTrader = tradersPayload.traders.find(
    (trader) => trader.name === TARGET_TRADER_NAME,
  );

  if (existingTrader) {
    return existingTrader;
  }

  const created = readJson(`${PRODUCTION_BASE_URL}/api/traders`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: TARGET_TRADER_NAME,
      platform: "X @StargazerBTC",
    }),
  });

  return created.trader;
}

async function main() {
  const localPayload = readJson(`${LOCAL_BASE_URL}/api/trader-records`);
  const localRecords = localPayload.records
    .filter((record) => record.trader?.name === TARGET_TRADER_NAME)
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt));

  if (localRecords.length === 0) {
    throw new Error(`本地没有找到交易员 ${TARGET_TRADER_NAME} 的记录`);
  }

  const trader = ensureProductionTrader();
  const productionPayload = readJson(`${PRODUCTION_BASE_URL}/api/trader-records`);
  const productionSignatures = new Set(
    productionPayload.records
      .filter((record) => record.trader?.name === TARGET_TRADER_NAME)
      .map(createRecordSignature),
  );

  let createdCount = 0;
  let skippedCount = 0;

  for (const record of localRecords) {
    const signature = createRecordSignature(record);

    if (productionSignatures.has(signature)) {
      skippedCount += 1;
      continue;
    }

    readJson(`${PRODUCTION_BASE_URL}/api/trader-records`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(buildCreateRecordPayload(record, trader.id)),
    });
    productionSignatures.add(signature);
    createdCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        trader: TARGET_TRADER_NAME,
        createdCount,
        skippedCount,
        totalLocalRecords: localRecords.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
