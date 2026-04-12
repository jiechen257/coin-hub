"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AssetSignalCard } from "@/components/command-center/asset-signal-card";
import { RiskPanel } from "@/components/command-center/risk-panel";
import type { RunResult } from "@/modules/runs/result-aggregator";

type DashboardState = RunResult | null;

export function CommandCenterDashboard() {
  const [data, setData] = useState<DashboardState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("加载仪表盘数据失败");
      }

      const payload = (await response.json()) as RunResult;
      setData(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "加载仪表盘数据失败",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategyVersion: data?.strategyVersion,
        }),
      });

      if (!response.ok) {
        throw new Error("分析任务入队失败");
      }

      const payload = (await response.json()) as {
        job: { id: string; status: string };
      };

      setMessage(`分析任务已入队（${payload.job.id}）`);
      // Refresh the dashboard so the latest snapshot stays visible after a run request.
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "分析任务入队失败",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const btc = data?.assets.BTC;
  const eth = data?.assets.ETH;

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
              实时执行
            </p>
            <h2 className="text-2xl font-semibold text-white">
              命令中心
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              这里汇总最新的双资产分析结果，并允许手动投递一次新的分析 job。
            </p>
          </div>

          <form onSubmit={handleRun}>
            <button
              type="submit"
              className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-500"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? "入队中..." : "运行分析"}
            </button>
          </form>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          {message ? (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-emerald-100">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-rose-100">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {isLoading && !data ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-slate-400">
          正在加载最新仪表盘快照...
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
          <div className="grid gap-6">
            {btc ? <AssetSignalCard symbol="BTC" data={btc} /> : null}
            {eth ? <AssetSignalCard symbol="ETH" data={eth} /> : null}
          </div>

          <RiskPanel
            warnings={data.warnings}
            degradedAssets={data.degradedAssets}
          />
        </div>
      ) : null}
    </section>
  );
}
