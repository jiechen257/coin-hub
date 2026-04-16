"use client";

import { useState } from "react";
import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

type RecordDetailProps = {
  record: ResearchDeskRecord | null;
  onSettlePlan: (input: {
    planId: string;
    entryPrice: number;
    exitPrice: number;
    settledAt: string;
    notes?: string;
  }) => Promise<void>;
};

function toLocalDateTimeValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function RecordDetail({ record, onSettlePlan }: RecordDetailProps) {
  const [settleMessage, setSettleMessage] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settlingPlanId, setSettlingPlanId] = useState<string | null>(null);
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [exitPrice, setExitPrice] = useState<string>("");
  const [settledAt, setSettledAt] = useState<string>(toLocalDateTimeValue());

  if (!record) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-lg font-semibold text-white">记录详情</h2>
        <p className="mt-3 text-sm text-slate-400">选择左侧记录后，这里会显示方案和样本状态。</p>
      </section>
    );
  }

  async function handleSettlePlan(plan: ResearchDeskRecord["executionPlans"][number]) {
    setSettlingPlanId(plan.id);
    setSettleError(null);
    setSettleMessage(null);

    try {
      await onSettlePlan({
        planId: plan.id,
        entryPrice: Number(entryPrice || plan.entryPrice || 0),
        exitPrice: Number(exitPrice || plan.exitPrice || 0),
        settledAt: new Date(settledAt).toISOString(),
      });
      setSettleMessage("样本已结算");
      setEntryPrice("");
      setExitPrice("");
      setSettledAt(toLocalDateTimeValue());
    } catch (error) {
      setSettleError(error instanceof Error ? error.message : "结算失败");
    } finally {
      setSettlingPlanId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.25em] text-sky-300/80">详情区</p>
        <h2 className="text-xl font-semibold text-white">{record.trader.name}</h2>
        <p className="text-sm text-slate-300">{record.rawContent}</p>
      </div>

      <div className="grid gap-2 text-sm text-slate-300">
        <p>资产：{record.symbol}</p>
        <p>类型：{record.recordType}</p>
        <p>来源：{record.sourceType}</p>
        <p>时间：{new Date(record.occurredAt).toLocaleString("zh-CN")}</p>
      </div>

      <div className="space-y-3">
        {record.executionPlans.map((plan) => (
          <article
            key={plan.id}
            className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-white">{plan.label}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {plan.side} · {plan.status}
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
                {plan.sample ? "已结算" : "待结算"}
              </span>
            </div>

            <div className="grid gap-1 text-sm text-slate-300">
              <p>触发：{plan.triggerText}</p>
              <p>入场：{plan.entryText}</p>
              {plan.riskText ? <p>风控：{plan.riskText}</p> : null}
              {plan.exitText ? <p>离场：{plan.exitText}</p> : null}
            </div>

            {plan.sample ? (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                <p>样本已结算</p>
                <p className="mt-1">
                  收益 {plan.sample.pnlValue} / {plan.sample.pnlPercent.toFixed(2)}%
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-200">
                    <span>开仓参考价</span>
                    <input
                      aria-label="开仓参考价"
                      type="number"
                      inputMode="decimal"
                      defaultValue={plan.entryPrice ?? ""}
                      onChange={(event) => setEntryPrice(event.target.value)}
                      className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-200">
                    <span>平仓参考价</span>
                    <input
                      aria-label="平仓参考价"
                      type="number"
                      inputMode="decimal"
                      defaultValue={plan.exitPrice ?? ""}
                      onChange={(event) => setExitPrice(event.target.value)}
                      className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                    />
                  </label>
                </div>

                <label className="grid gap-1 text-sm text-slate-200">
                  <span>结算时间</span>
                  <input
                    aria-label="结算时间"
                    type="datetime-local"
                    value={settledAt}
                    onChange={(event) => setSettledAt(event.target.value)}
                    className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleSettlePlan(plan)}
                  disabled={settlingPlanId === plan.id}
                  className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  {settlingPlanId === plan.id ? "结算中..." : "结算样本"}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {settleMessage ? (
        <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
          {settleMessage}
        </p>
      ) : null}
      {settleError ? (
        <p className="rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {settleError}
        </p>
      ) : null}
    </section>
  );
}
