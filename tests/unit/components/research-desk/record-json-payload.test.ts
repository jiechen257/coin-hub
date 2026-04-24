// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseJsonRecordRequest } from "@/components/research-desk/record-json-payload";
import type { ResearchDeskTrader } from "@/components/research-desk/research-desk-types";

const traders: ResearchDeskTrader[] = [
  {
    id: "trader-jianjian",
    name: "简简",
    platform: "manual",
    notes: null,
  },
];

describe("parseJsonRecordRequest", () => {
  it("normalizes an LLM-friendly view record payload into the create request shape", () => {
    expect(
      parseJsonRecordRequest({
        text: JSON.stringify({
          traderName: "简简",
          symbol: "BTC",
          recordType: "view",
          occurredAt: "2026-04-23T08:00:00.000Z",
          rawContent: "大饼走出最强模式，4h上涨延伸",
          plans: [
            {
              label: "1h上涨延伸跟随",
              side: "long",
              triggerText: "不跌回5m中枢",
              entryText: "关注三买机会",
              riskText: "跌回5m中枢失效",
            },
          ],
        }),
        traders,
      }),
    ).toEqual({
      traderId: "trader-jianjian",
      symbol: "BTC",
      recordType: "view",
      sourceType: "manual",
      startedAt: "2026-04-23T08:00:00.000Z",
      endedAt: "2026-04-23T08:00:00.000Z",
      rawContent: "大饼走出最强模式，4h上涨延伸",
      plans: [
        {
          label: "1h上涨延伸跟随",
          side: "long",
          triggerText: "不跌回5m中枢",
          entryText: "关注三买机会",
          riskText: "跌回5m中枢失效",
        },
      ],
    });
  });

  it("accepts wrapped API payloads and falls back to the selected trader", () => {
    expect(
      parseJsonRecordRequest({
        text: JSON.stringify({
          record: {
            symbol: "ETH",
            recordType: "trade",
            startedAt: "2026-04-23T08:00:00.000Z",
            endedAt: "2026-04-23T10:00:00.000Z",
            rawContent: "ETH 突破跟随",
            trade: {
              side: "short",
              entryPrice: "3500",
              exitPrice: 3420,
              triggerText: "跌破中枢",
              entryText: "反抽不过入场",
            },
          },
        }),
        traders,
        fallbackTraderId: "trader-jianjian",
      }),
    ).toMatchObject({
      traderId: "trader-jianjian",
      symbol: "ETH",
      recordType: "trade",
      sourceType: "manual",
      trade: {
        side: "short",
        entryPrice: 3500,
        exitPrice: 3420,
      },
      plans: [],
    });
  });

  it("throws a clear error when traderName cannot be matched", () => {
    expect(() =>
      parseJsonRecordRequest({
        text: JSON.stringify({
          traderName: "不存在",
          symbol: "BTC",
          recordType: "view",
          occurredAt: "2026-04-23T08:00:00.000Z",
          rawContent: "观点",
          plans: [
            {
              label: "plan-a",
              side: "long",
              triggerText: "触发",
              entryText: "入场",
            },
          ],
        }),
        traders,
      }),
    ).toThrow("JSON 中的 traderName 未匹配到当前交易员");
  });
});
