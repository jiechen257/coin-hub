import {
  buildPreviewText,
  extractRecordInsights,
  formatPlanSide,
} from "@/components/research-desk/record-detail-utils";
import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

const mockRecord: ResearchDeskRecord = {
  id: "record-1",
  traderId: "trader-1",
  symbol: "BTC",
  timeframe: "1h",
  recordType: "view",
  sourceType: "twitter",
  occurredAt: "2026-04-15T00:00:00.000Z",
  rawContent:
    "回踩不破69200这周继续上行\n关注4月17-19号的低点\n若高点y突破76000，上方关注78000-79000",
  notes: "来源：推特-简简；当前判断：A > B。",
  trader: {
    id: "trader-1",
    name: "推特-简简",
    platform: "twitter",
    notes: null,
  },
  executionPlans: [
    {
      id: "plan-1",
      label: "A-1h上涨延续",
      status: "draft",
      side: "long",
      entryPrice: null,
      exitPrice: null,
      stopLoss: null,
      takeProfit: null,
      marketContext: "BTC 触及 76000 后的延续推演",
      triggerText: "若高点 y 突破 76000，则继续看上行延伸。",
      entryText: "等待 x-y 上涨确认。",
      riskText: "17-19 号关注低点。",
      exitText: "上方关注 78000-79000。",
      notes: null,
      sample: null,
    },
  ],
};

describe("record-detail-utils", () => {
  it("extracts structured insights from raw text and notes", () => {
    expect(extractRecordInsights(mockRecord)).toEqual({
      summary: "来源：推特-简简；当前判断：A > B。",
      keyLevels: ["69200", "76000", "78000-79000"],
      timeNodes: ["4月17-19号"],
      previewText:
        "回踩不破69200这周继续上行 关注4月17-19号的低点 若高点y突破76000，上方关注78000-79000",
    });
  });

  it("builds preview text and side labels", () => {
    expect(buildPreviewText(mockRecord)).toContain("关注4月17-19号的低点");
    expect(formatPlanSide("long")).toBe("做多");
    expect(formatPlanSide("short")).toBe("做空");
  });
});
