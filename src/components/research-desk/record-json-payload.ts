import type { CreateRecordRequest } from "@/components/research-desk/record-form";
import type {
  ResearchDeskSourceType,
  ResearchDeskSymbol,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import { parseRecordMorphology } from "@/modules/records/record-morphology";

type JsonObject = Record<string, unknown>;

type ParseJsonRecordRequestInput = {
  text: string;
  traders: ResearchDeskTrader[];
  fallbackTraderId?: string;
  fallbackSymbol?: ResearchDeskSymbol;
  fallbackStartedAt?: string;
  fallbackEndedAt?: string;
};

const SOURCE_TYPES = new Set<ResearchDeskSourceType>([
  "manual",
  "twitter",
  "telegram",
  "discord",
  "custom-import",
]);
const SYMBOLS = new Set<ResearchDeskSymbol>(["BTC", "ETH"]);
const SIDES = new Set(["long", "short"]);

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(input: JsonObject, key: string) {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readRequiredString(input: JsonObject, key: string) {
  const value = readString(input, key);

  if (!value) {
    throw new Error(`JSON 缺少 ${key}`);
  }

  return value;
}

function readOptionalNumber(input: JsonObject, key: string) {
  const value = input[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`JSON 字段 ${key} 必须是非负数字`);
  }

  return parsed;
}

function readRequiredNumber(input: JsonObject, key: string) {
  const value = readOptionalNumber(input, key);

  if (value === undefined) {
    throw new Error(`JSON 缺少 ${key}`);
  }

  return value;
}

function toIsoDateTime(value: string, key: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(`JSON 字段 ${key} 不是有效时间`);
  }

  return date.toISOString();
}

function unwrapRecordPayload(payload: unknown) {
  if (!isObject(payload)) {
    throw new Error("JSON 顶层必须是对象");
  }

  const wrappedRecord = payload.record;
  return isObject(wrappedRecord) ? wrappedRecord : payload;
}

function resolveTraderId(input: {
  record: JsonObject;
  traders: ResearchDeskTrader[];
  fallbackTraderId?: string;
}) {
  const traderId = readString(input.record, "traderId") ?? input.fallbackTraderId;

  if (traderId) {
    if (!input.traders.some((trader) => trader.id === traderId)) {
      throw new Error("JSON 中的 traderId 不在当前交易员列表中");
    }

    return traderId;
  }

  const traderObject = input.record.trader;
  const traderName =
    readString(input.record, "traderName") ??
    (isObject(traderObject) ? readString(traderObject, "name") : undefined);

  if (!traderName) {
    throw new Error("JSON 需要 traderId、traderName 或当前选择的交易员");
  }

  const matchedTrader = input.traders.find(
    (trader) => trader.name.trim().toLowerCase() === traderName.toLowerCase(),
  );

  if (!matchedTrader) {
    throw new Error("JSON 中的 traderName 未匹配到当前交易员");
  }

  return matchedTrader.id;
}

function readSymbol(record: JsonObject, fallbackSymbol?: ResearchDeskSymbol) {
  const value = readString(record, "symbol") ?? fallbackSymbol;

  if (!value || !SYMBOLS.has(value as ResearchDeskSymbol)) {
    throw new Error("JSON 字段 symbol 必须是 BTC 或 ETH");
  }

  return value as ResearchDeskSymbol;
}

function readSourceType(record: JsonObject) {
  const value = readString(record, "sourceType") ?? "manual";

  if (!SOURCE_TYPES.has(value as ResearchDeskSourceType)) {
    throw new Error("JSON 字段 sourceType 不受支持");
  }

  return value as ResearchDeskSourceType;
}

function readTimeRange(input: ParseJsonRecordRequestInput, record: JsonObject) {
  const startedAtSource =
    readString(record, "startedAt") ??
    readString(record, "occurredAt") ??
    input.fallbackStartedAt;

  if (!startedAtSource) {
    throw new Error("JSON 需要 startedAt 或 occurredAt");
  }

  const endedAtSource =
    readString(record, "endedAt") ??
    readString(record, "occurredAt") ??
    input.fallbackEndedAt ??
    startedAtSource;
  const startedAt = toIsoDateTime(startedAtSource, "startedAt");
  const endedAt = toIsoDateTime(endedAtSource, "endedAt");

  if (new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
    throw new Error("JSON 字段 endedAt 不能早于 startedAt");
  }

  return { startedAt, endedAt };
}

function readSide(input: JsonObject) {
  const side = readRequiredString(input, "side");

  if (!SIDES.has(side)) {
    throw new Error("JSON 字段 side 必须是 long 或 short");
  }

  return side as "long" | "short";
}

function readOptionalText(input: JsonObject, key: string) {
  return readString(input, key);
}

function readPlan(input: unknown, index: number) {
  if (!isObject(input)) {
    throw new Error(`JSON plans[${index}] 必须是对象`);
  }

  return {
    label: readRequiredString(input, "label"),
    side: readSide(input),
    ...(readOptionalNumber(input, "entryPrice") !== undefined
      ? { entryPrice: readOptionalNumber(input, "entryPrice") }
      : {}),
    ...(readOptionalNumber(input, "exitPrice") !== undefined
      ? { exitPrice: readOptionalNumber(input, "exitPrice") }
      : {}),
    ...(readOptionalNumber(input, "stopLoss") !== undefined
      ? { stopLoss: readOptionalNumber(input, "stopLoss") }
      : {}),
    ...(readOptionalNumber(input, "takeProfit") !== undefined
      ? { takeProfit: readOptionalNumber(input, "takeProfit") }
      : {}),
    ...(readOptionalText(input, "marketContext")
      ? { marketContext: readOptionalText(input, "marketContext") }
      : {}),
    triggerText: readRequiredString(input, "triggerText"),
    entryText: readRequiredString(input, "entryText"),
    ...(readOptionalText(input, "riskText")
      ? { riskText: readOptionalText(input, "riskText") }
      : {}),
    ...(readOptionalText(input, "exitText")
      ? { exitText: readOptionalText(input, "exitText") }
      : {}),
    ...(readOptionalText(input, "notes")
      ? { notes: readOptionalText(input, "notes") }
      : {}),
  };
}

function readTrade(input: unknown) {
  if (!isObject(input)) {
    throw new Error("JSON 字段 trade 必须是对象");
  }

  return {
    side: readSide(input),
    entryPrice: readRequiredNumber(input, "entryPrice"),
    exitPrice: readRequiredNumber(input, "exitPrice"),
    ...(readOptionalNumber(input, "stopLoss") !== undefined
      ? { stopLoss: readOptionalNumber(input, "stopLoss") }
      : {}),
    ...(readOptionalNumber(input, "takeProfit") !== undefined
      ? { takeProfit: readOptionalNumber(input, "takeProfit") }
      : {}),
    ...(readOptionalText(input, "marketContext")
      ? { marketContext: readOptionalText(input, "marketContext") }
      : {}),
    triggerText: readRequiredString(input, "triggerText"),
    entryText: readRequiredString(input, "entryText"),
    ...(readOptionalText(input, "riskText")
      ? { riskText: readOptionalText(input, "riskText") }
      : {}),
    ...(readOptionalText(input, "exitText")
      ? { exitText: readOptionalText(input, "exitText") }
      : {}),
    ...(readOptionalText(input, "notes")
      ? { notes: readOptionalText(input, "notes") }
      : {}),
  };
}

export function parseJsonRecordRequest(
  input: ParseJsonRecordRequestInput,
): CreateRecordRequest {
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(input.text);
  } catch {
    throw new Error("JSON 格式不正确");
  }

  const record = unwrapRecordPayload(parsedPayload);
  const traderId = resolveTraderId({
    record,
    traders: input.traders,
    fallbackTraderId: input.fallbackTraderId,
  });
  const symbol = readSymbol(record, input.fallbackSymbol);
  const sourceType = readSourceType(record);
  const { startedAt, endedAt } = readTimeRange(input, record);
  const rawContent = readRequiredString(record, "rawContent");
  const morphology = record.morphology
    ? parseRecordMorphology(record.morphology)
    : undefined;
  const basePayload = {
    traderId,
    symbol,
    sourceType,
    startedAt,
    endedAt,
    ...(morphology ? { morphology } : {}),
    rawContent,
    ...(readOptionalText(record, "notes")
      ? { notes: readOptionalText(record, "notes") }
      : {}),
  };
  const recordType = readRequiredString(record, "recordType");

  if (recordType === "trade") {
    return {
      ...basePayload,
      recordType,
      trade: readTrade(record.trade),
      plans: [],
    };
  }

  if (recordType === "view") {
    const rawPlans = record.plans;

    if (!Array.isArray(rawPlans) || rawPlans.length === 0) {
      throw new Error("JSON 字段 plans 至少需要一个方案");
    }

    return {
      ...basePayload,
      recordType,
      plans: rawPlans.map(readPlan),
    };
  }

  throw new Error("JSON 字段 recordType 必须是 trade 或 view");
}
