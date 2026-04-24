// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordForm } from "@/components/research-desk/record-form";
import type { ResearchDeskTrader } from "@/components/research-desk/research-desk-types";

const traders: ResearchDeskTrader[] = [
  {
    id: "trader-jianjian",
    name: "简简",
    platform: "manual",
    notes: null,
  },
];

describe("RecordForm", () => {
  it("creates a record from pasted JSON parameters", async () => {
    const user = userEvent.setup();
    const onCreateRecord = vi.fn().mockResolvedValue(undefined);

    render(
      <RecordForm
        traders={traders}
        onCreateTrader={vi.fn()}
        onCreateRecord={onCreateRecord}
        variant="dialog"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "JSON 参数" }));
    const jsonInput = screen.getByLabelText("JSON 参数");

    await user.clear(jsonInput);
    await user.click(jsonInput);
    await user.paste(
      JSON.stringify({
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
          },
        ],
      }),
    );
    await user.click(screen.getByRole("button", { name: /解析并保存记录/ }));

    await waitFor(() => expect(onCreateRecord).toHaveBeenCalledTimes(1));
    expect(onCreateRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        traderId: "trader-jianjian",
        symbol: "BTC",
        recordType: "view",
        sourceType: "manual",
        startedAt: "2026-04-23T08:00:00.000Z",
        endedAt: "2026-04-23T08:00:00.000Z",
        rawContent: "大饼走出最强模式，4h上涨延伸",
        plans: [
          expect.objectContaining({
            label: "1h上涨延伸跟随",
            side: "long",
          }),
        ],
      }),
    );
  });
});
