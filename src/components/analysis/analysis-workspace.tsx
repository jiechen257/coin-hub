"use client";

import { useEffect, useRef, useState } from "react";
import {
  type AnalysisPayload,
  type AnalysisSymbol,
  type AnalysisTimeframe,
} from "@/components/analysis/analysis-data";
import { EvidencePanel } from "@/components/analysis/evidence-panel";
import { PriceChart } from "@/components/analysis/price-chart";
import { TimeframeSwitcher } from "@/components/analysis/timeframe-switcher";
import { formatSignalBias } from "@/lib/display-text";

type AnalysisWorkspaceProps = {
  initialData: AnalysisPayload;
};

const SYMBOLS: AnalysisSymbol[] = ["BTC", "ETH"];

export function AnalysisWorkspace({ initialData }: AnalysisWorkspaceProps) {
  const [selection, setSelection] = useState(initialData.selection);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const controller = new AbortController();

    async function refreshAnalysis() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/analysis/${selection.symbol}?timeframe=${selection.timeframe}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`分析请求失败（${response.status}）`);
        }

        const payload = (await response.json()) as AnalysisPayload;
        setData(payload);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载 analysis 数据失败",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void refreshAnalysis();

    return () => {
      controller.abort();
    };
  }, [selection.symbol, selection.timeframe]);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <div className="space-y-6">
        <header className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-sky-300/80">
                分析工作台
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                BTC / ETH 图表研究
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                切换资产和时间框架，观察 K 线结构、观点摘要和当前信号如何一起变化。
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                当前视图
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {data.selection.symbol} / {data.selection.timeframe}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {SYMBOLS.map((symbol) => {
                const active = symbol === selection.symbol;

                return (
                  <button
                    key={symbol}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelection((current) => ({ ...current, symbol }))}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
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
              value={selection.timeframe as AnalysisTimeframe}
              onChange={(timeframe) =>
                setSelection((current) => ({ ...current, timeframe }))
              }
              disabled={loading}
            />
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              观点数：{data.viewpoints.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              告警数：{data.warnings.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              K 线数：{data.chart.candles.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              当前信号：{formatSignalBias(data.signal.bias)}
            </span>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="text-sm text-sky-200">正在刷新分析视图...</p>
          ) : null}
        </header>

        <PriceChart
          symbol={data.selection.symbol}
          timeframe={data.selection.timeframe}
          candles={data.chart.candles}
          structureMarkers={data.chart.structureMarkers}
          signalMarkers={data.chart.signalMarkers}
          tweetMarkers={data.chart.tweetMarkers}
        />
      </div>

      <EvidencePanel
        signal={data.signal}
        warnings={data.warnings}
        viewpoints={data.viewpoints}
      />
    </section>
  );
}
