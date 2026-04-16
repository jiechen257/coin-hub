"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ResearchDeskSymbol,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";

type TradePayload = {
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  marketContext?: string;
  triggerText: string;
  entryText: string;
  riskText?: string;
  exitText?: string;
  notes?: string;
};

type ViewPlanPayload = {
  label: string;
  side: "long" | "short";
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  marketContext?: string;
  triggerText: string;
  entryText: string;
  riskText?: string;
  exitText?: string;
  notes?: string;
};

export type CreateRecordRequest =
  | {
      traderId: string;
      symbol: ResearchDeskSymbol;
      recordType: "trade";
      sourceType: "manual";
      occurredAt: string;
      rawContent: string;
      notes?: string;
      trade: TradePayload;
      plans: [];
    }
  | {
      traderId: string;
      symbol: ResearchDeskSymbol;
      recordType: "view";
      sourceType: "manual";
      occurredAt: string;
      rawContent: string;
      notes?: string;
      plans: ViewPlanPayload[];
    };

type RecordFormProps = {
  traders: ResearchDeskTrader[];
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
};

type ViewPlanFormState = {
  label: string;
  side: "long" | "short";
  marketContext: string;
  triggerText: string;
  entryText: string;
  riskText: string;
  exitText: string;
};

function toLocalDateTimeValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function createEmptyViewPlan(index: number): ViewPlanFormState {
  return {
    label: `plan-${index + 1}`,
    side: "long",
    marketContext: "",
    triggerText: "",
    entryText: "",
    riskText: "",
    exitText: "",
  };
}

export function RecordForm({
  traders,
  onCreateTrader,
  onCreateRecord,
}: RecordFormProps) {
  const [traderName, setTraderName] = useState("");
  const [selectedTraderId, setSelectedTraderId] = useState<string>("");
  const [symbol, setSymbol] = useState<ResearchDeskSymbol>("BTC");
  const [recordType, setRecordType] = useState<"trade" | "view">("trade");
  const [occurredAt, setOccurredAt] = useState(toLocalDateTimeValue());
  const [rawContent, setRawContent] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [tradeSide, setTradeSide] = useState<"long" | "short">("long");
  const [tradeMarketContext, setTradeMarketContext] = useState("");
  const [tradeTriggerText, setTradeTriggerText] = useState("");
  const [tradeEntryText, setTradeEntryText] = useState("");
  const [tradeRiskText, setTradeRiskText] = useState("");
  const [tradeExitText, setTradeExitText] = useState("");
  const [viewPlans, setViewPlans] = useState<ViewPlanFormState[]>([
    createEmptyViewPlan(0),
  ]);
  const [isCreatingTrader, setIsCreatingTrader] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const traderOptions = useMemo(() => traders, [traders]);

  useEffect(() => {
    if (!selectedTraderId && traderOptions[0]) {
      setSelectedTraderId(traderOptions[0].id);
    }

    if (
      selectedTraderId &&
      traderOptions.every((trader) => trader.id !== selectedTraderId)
    ) {
      setSelectedTraderId(traderOptions[0]?.id ?? "");
    }
  }, [selectedTraderId, traderOptions]);

  async function handleCreateTrader() {
    if (!traderName.trim()) {
      setError("先输入交易员名称");
      return;
    }

    setIsCreatingTrader(true);
    setError(null);
    setMessage(null);

    try {
      const trader = await onCreateTrader({ name: traderName.trim(), platform: "manual" });
      setTraderName("");
      setSelectedTraderId(trader.id);
      setMessage(`已新增交易员 ${trader.name}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "新增交易员失败");
    } finally {
      setIsCreatingTrader(false);
    }
  }

  function resetRecordForm() {
    setRawContent("");
    setEntryPrice("");
    setExitPrice("");
    setTradeSide("long");
    setTradeMarketContext("");
    setTradeTriggerText("");
    setTradeEntryText("");
    setTradeRiskText("");
    setTradeExitText("");
    setViewPlans([createEmptyViewPlan(0)]);
    setOccurredAt(toLocalDateTimeValue());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const traderId = selectedTraderId || traderOptions[0]?.id || "";

    if (!traderId) {
      setError("请先创建或选择交易员");
      return;
    }

    setIsSavingRecord(true);
    setError(null);
    setMessage(null);

    try {
      if (recordType === "trade") {
        await onCreateRecord({
          traderId,
          symbol,
          recordType: "trade",
          sourceType: "manual",
          occurredAt: new Date(occurredAt).toISOString(),
          rawContent,
          trade: {
            side: tradeSide,
            entryPrice: Number(entryPrice),
            exitPrice: Number(exitPrice),
            marketContext: tradeMarketContext || undefined,
            triggerText: tradeTriggerText || "copy trader fill",
            entryText: tradeEntryText || "copy trader fill",
            riskText: tradeRiskText || undefined,
            exitText: tradeExitText || "close with trader",
          },
          plans: [],
        });
      } else {
        await onCreateRecord({
          traderId,
          symbol,
          recordType: "view",
          sourceType: "manual",
          occurredAt: new Date(occurredAt).toISOString(),
          rawContent,
          plans: viewPlans.map((plan) => ({
            label: plan.label,
            side: plan.side,
            marketContext: plan.marketContext || undefined,
            triggerText: plan.triggerText,
            entryText: plan.entryText,
            riskText: plan.riskText || undefined,
            exitText: plan.exitText || undefined,
          })),
        });
      }

      resetRecordForm();
      setMessage("记录已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存记录失败");
    } finally {
      setIsSavingRecord(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-300/80">录入区</p>
        <h2 className="text-xl font-semibold text-white">记录流</h2>
      </div>

      <div className="grid gap-2">
        <label className="grid gap-1 text-sm text-slate-200">
          <span>交易员名称</span>
          <input
            aria-label="交易员名称"
            value={traderName}
            onChange={(event) => setTraderName(event.target.value)}
            className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <button
          type="button"
          onClick={handleCreateTrader}
          disabled={isCreatingTrader}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white"
        >
          {isCreatingTrader ? "新增中..." : "新增交易员"}
        </button>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm text-slate-200">
          <span>选择交易员</span>
          <select
            value={selectedTraderId}
            onChange={(event) => setSelectedTraderId(event.target.value)}
            className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="">请选择</option>
            {traderOptions.map((trader) => (
              <option key={trader.id} value={trader.id}>
                {trader.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-200">
            <span>资产</span>
            <select
              value={symbol}
              onChange={(event) => setSymbol(event.target.value as ResearchDeskSymbol)}
              className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
            >
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-200">
            <span>记录时间</span>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-200">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="recordType"
              checked={recordType === "trade"}
              onChange={() => setRecordType("trade")}
            />
            真实开单
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="recordType"
              checked={recordType === "view"}
              onChange={() => setRecordType("view")}
            />
            行情观点
          </label>
        </div>

        <label className="grid gap-1 text-sm text-slate-200">
          <span>原始记录</span>
          <textarea
            aria-label="原始记录"
            value={rawContent}
            onChange={(event) => setRawContent(event.target.value)}
            className="min-h-24 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
          />
        </label>

        {recordType === "trade" ? (
          <>
            <div className="flex flex-wrap gap-4 text-sm text-slate-200">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tradeSide"
                  checked={tradeSide === "long"}
                  onChange={() => setTradeSide("long")}
                />
                多单
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tradeSide"
                  checked={tradeSide === "short"}
                  onChange={() => setTradeSide("short")}
                />
                空单
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-200">
                <span>入场价</span>
                <input
                  aria-label="入场价"
                  type="number"
                  inputMode="decimal"
                  value={entryPrice}
                  onChange={(event) => setEntryPrice(event.target.value)}
                  className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                <span>出场价</span>
                <input
                  aria-label="出场价"
                  type="number"
                  inputMode="decimal"
                  value={exitPrice}
                  onChange={(event) => setExitPrice(event.target.value)}
                  className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-200">
                <span>市场环境</span>
                <input
                  value={tradeMarketContext}
                  onChange={(event) => setTradeMarketContext(event.target.value)}
                  className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-200">
                <span>触发条件</span>
                <input
                  value={tradeTriggerText}
                  onChange={(event) => setTradeTriggerText(event.target.value)}
                  className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                />
              </label>
            </div>
          </>
        ) : (
          <div className="grid gap-3">
            {viewPlans.map((plan, index) => (
              <div
                key={`${plan.label}-${index}`}
                className="grid gap-3 rounded-md border border-white/10 bg-slate-950/60 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-white">方案 {index + 1}</h3>
                  {viewPlans.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setViewPlans((current) =>
                          current.filter((_, planIndex) => planIndex !== index),
                        )
                      }
                      className="text-xs text-rose-200"
                    >
                      删除
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-200">
                    <span>方案标签</span>
                    <input
                      value={plan.label}
                      onChange={(event) =>
                        setViewPlans((current) =>
                          current.map((item, planIndex) =>
                            planIndex === index
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-200">
                    <span>方向</span>
                    <select
                      value={plan.side}
                      onChange={(event) =>
                        setViewPlans((current) =>
                          current.map((item, planIndex) =>
                            planIndex === index
                              ? {
                                  ...item,
                                  side: event.target.value as "long" | "short",
                                }
                              : item,
                          ),
                        )
                      }
                      className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    >
                      <option value="long">long</option>
                      <option value="short">short</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-200">
                    <span>市场环境</span>
                    <input
                      value={plan.marketContext}
                      onChange={(event) =>
                        setViewPlans((current) =>
                          current.map((item, planIndex) =>
                            planIndex === index
                              ? { ...item, marketContext: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-200">
                    <span>触发条件</span>
                    <input
                      value={plan.triggerText}
                      onChange={(event) =>
                        setViewPlans((current) =>
                          current.map((item, planIndex) =>
                            planIndex === index
                              ? { ...item, triggerText: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                </div>
                <label className="grid gap-1 text-sm text-slate-200">
                  <span>入场条件</span>
                  <input
                    value={plan.entryText}
                    onChange={(event) =>
                      setViewPlans((current) =>
                        current.map((item, planIndex) =>
                          planIndex === index
                            ? { ...item, entryText: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setViewPlans((current) => [
                  ...current,
                  createEmptyViewPlan(current.length),
                ])
              }
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              新增方案
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isSavingRecord}
          className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {isSavingRecord ? "保存中..." : "保存记录"}
        </button>
      </form>

      {message ? (
        <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}
