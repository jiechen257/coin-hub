"use client";

import { useEffect, useMemo, useState } from "react";
import { PriceChart } from "@/components/analysis/price-chart";
import { TimeframeSwitcher } from "@/components/analysis/timeframe-switcher";
import {
  buildRecordMarkers,
  type ResearchDeskPayload,
  type ResearchDeskRecord,
  type ResearchDeskSymbol,
  type ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import {
  RecordForm,
  type CreateRecordRequest,
} from "@/components/research-desk/record-form";
import { RecordList } from "@/components/research-desk/record-list";
import { RecordDetail } from "@/components/research-desk/record-detail";
import { StrategyCandidateList } from "@/components/research-desk/strategy-candidate-list";

type ResearchDeskProps = {
  initialData: ResearchDeskPayload;
};

const SYMBOLS: ResearchDeskSymbol[] = ["BTC", "ETH"];
const MARKET_POLL_INTERVAL_MS = 30_000;

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `请求失败（${response.status}）`);
  }

  return (await response.json()) as T;
}

export function ResearchDesk({ initialData }: ResearchDeskProps) {
  const [selection, setSelection] = useState(initialData.selection);
  const [traders, setTraders] = useState(initialData.traders);
  const [records, setRecords] = useState(initialData.records);
  const [selectedRecordId, setSelectedRecordId] = useState(
    initialData.selectedRecordId,
  );
  const [candidates, setCandidates] = useState(initialData.candidates);
  const [candles, setCandles] = useState(initialData.chart.candles);
  const [chartError, setChartError] = useState<string | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const selectedRecord = useMemo(
    () =>
      records.find((record) => record.id === selectedRecordId) ??
      records[0] ??
      null,
    [records, selectedRecordId],
  );

  const markers = useMemo(
    () => buildRecordMarkers(records, selection.symbol),
    [records, selection.symbol],
  );

  useEffect(() => {
    if (!selectedRecordId && records[0]) {
      setSelectedRecordId(records[0].id);
    }
  }, [records, selectedRecordId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMarket() {
      setIsChartLoading(true);
      setChartError(null);

      try {
        const payload = await parseResponse<{
          candles: typeof initialData.chart.candles;
          warning: string | null;
        }>(
          await fetch(
            `/api/market/${selection.symbol}?timeframe=${selection.timeframe}`,
            { cache: "no-store" },
          ),
        );

        if (!cancelled) {
          setCandles(payload.candles);
          setChartError(payload.warning);
        }
      } catch (error) {
        if (!cancelled) {
          setChartError(
            error instanceof Error ? error.message : "加载行情数据失败",
          );
        }
      } finally {
        if (!cancelled) {
          setIsChartLoading(false);
        }
      }
    }

    void loadMarket();
    const intervalId = window.setInterval(() => {
      void loadMarket();
    }, MARKET_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selection.symbol, selection.timeframe, initialData.chart.candles]);

  async function refreshRecords() {
    const payload = await parseResponse<{ records: ResearchDeskRecord[] }>(
      await fetch("/api/trader-records", { cache: "no-store" }),
    );
    setRecords(payload.records);
  }

  async function handleCreateTrader(input: {
    name: string;
    platform?: string;
    notes?: string;
  }): Promise<ResearchDeskTrader> {
    const payload = await parseResponse<{ trader: ResearchDeskTrader }>(
      await fetch("/api/traders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );

    setTraders((current) =>
      [...current, payload.trader].sort((left, right) =>
        left.name.localeCompare(right.name, "zh-CN"),
      ),
    );

    return payload.trader;
  }

  async function handleCreateRecord(input: CreateRecordRequest) {
    const payload = await parseResponse<{ record: ResearchDeskRecord }>(
      await fetch("/api/trader-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );

    setRecords((current) => [payload.record, ...current]);
    setSelectedRecordId(payload.record.id);
  }

  async function handleSettlePlan(input: {
    planId: string;
    entryPrice: number;
    exitPrice: number;
    settledAt: string;
    notes?: string;
  }) {
    const { planId, ...payload } = input;

    await parseResponse<{ sample: { id: string } }>(
      await fetch(`/api/execution-plans/${planId}/settle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    await refreshRecords();
  }

  async function handleRegenerateCandidates() {
    setCandidateMessage(null);
    setCandidateError(null);

    try {
      const payload = await parseResponse<{
        regenerated: number;
        candidates: typeof initialData.candidates;
      }>(
        await fetch("/api/strategy-candidates", {
          method: "POST",
        }),
      );

      setCandidates(payload.candidates);
      setCandidateMessage(`已归纳 ${payload.regenerated} 条候选策略`);
    } catch (error) {
      setCandidateError(
        error instanceof Error ? error.message : "归纳候选策略失败",
      );
    }
  }

  return (
    <section className="grid gap-6">
      <header className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
            Coin Hub
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            交易员策略研究台
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            在一个工作台里管理交易员记录、观察 BTC / ETH K 线、结算样本并归纳候选策略。
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {SYMBOLS.map((symbol) => {
              const active = symbol === selection.symbol;

              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setSelection((current) => ({ ...current, symbol }))}
                  className={[
                    "rounded-md border px-4 py-2 text-sm font-medium transition",
                    active
                      ? "border-emerald-400/40 bg-emerald-400 text-slate-950"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-emerald-400/40 hover:bg-emerald-400/10",
                  ].join(" ")}
                >
                  {symbol}
                </button>
              );
            })}
          </div>

          <TimeframeSwitcher
            value={selection.timeframe}
            onChange={(timeframe) =>
              setSelection((current) => ({ ...current, timeframe }))
            }
            disabled={isChartLoading}
          />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <RecordForm
            traders={traders}
            onCreateTrader={handleCreateTrader}
            onCreateRecord={handleCreateRecord}
          />
          <RecordList
            records={records}
            selectedRecordId={selectedRecord?.id ?? null}
            onSelect={setSelectedRecordId}
          />
        </div>

        <div className="grid gap-4">
          <PriceChart
            symbol={selection.symbol}
            timeframe={selection.timeframe}
            candles={candles}
            markers={markers}
          />
          {chartError ? (
            <p className="rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
              {chartError}
            </p>
          ) : null}
          {isChartLoading ? (
            <p className="text-sm text-slate-400">正在刷新行情数据...</p>
          ) : null}
        </div>

        <div className="grid gap-6">
          <RecordDetail record={selectedRecord} onSettlePlan={handleSettlePlan} />
          <StrategyCandidateList
            candidates={candidates}
            onRegenerate={handleRegenerateCandidates}
          />
          {candidateMessage ? (
            <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
              {candidateMessage}
            </p>
          ) : null}
          {candidateError ? (
            <p className="rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
              {candidateError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
