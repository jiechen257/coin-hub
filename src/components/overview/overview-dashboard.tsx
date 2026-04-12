"use client";

import { useState } from "react";
import type { OverviewPayload } from "@/modules/overview/overview-service";
import { AssetSignalCard } from "@/components/command-center/asset-signal-card";
import { RiskPanel } from "@/components/command-center/risk-panel";
import { OverviewConfigCard } from "@/components/overview/overview-config-card";
import { OverviewOperationsPanel } from "@/components/overview/overview-operations-panel";
import { OverviewQuickActions } from "@/components/overview/overview-quick-actions";
import { OverviewSummaryStrip } from "@/components/overview/overview-summary-strip";

type OverviewDashboardProps = {
  initialData: OverviewPayload;
};

// 首页总览是一个客户端控制台容器，负责把服务端数据变成可刷新、可操作的控制面板。
export function OverviewDashboard({ initialData }: OverviewDashboardProps) {
  const [data, setData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 重新拉取首页聚合数据，保证运行分析后页面展示和数据库状态保持一致。
  async function refreshOverview() {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/overview", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("刷新首页总览失败");
      }

      const payload = (await response.json()) as OverviewPayload;
      setData(payload);
    } finally {
      setIsRefreshing(false);
    }
  }

  // 触发一次分析任务并在成功后刷新首页，让最新运行状态立刻回到控制台。
  async function handleRunAnalysis() {
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategyVersion: data.marketSummary.strategyVersion ?? undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("运行分析失败");
      }

      const payload = (await response.json()) as {
        job: { id: string };
      };

      setStatusMessage(`分析任务已提交（${payload.job.id}）`);
      await refreshOverview();
    } catch (requestError) {
      setErrorMessage(
        requestError instanceof Error ? requestError.message : "运行分析失败",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
          首页总览
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          策略总览
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-300">
          首页直接展示当前策略版本、最近运行、风险信号、配置摘要和常用动作，方便快速判断下一步要处理什么。
        </p>
      </header>

      <OverviewSummaryStrip marketSummary={data.marketSummary} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.86fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4 shadow-sm shadow-slate-950/20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
                  资产状态
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  资产状态列表
                </h2>
              </div>
              <p className="text-sm text-slate-400">
                {data.assets.length} 个资产
              </p>
            </div>

            {data.assets.length > 0 ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {data.assets.map((asset) => (
                  <AssetSignalCard
                    key={asset.symbol}
                    symbol={asset.symbol}
                    data={asset}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
                还没有资产信号，先运行一次分析任务。
              </p>
            )}
          </section>

          <OverviewOperationsPanel operations={data.operations} />
        </div>

        <div className="space-y-6">
          <OverviewQuickActions
            strategyVersion={data.marketSummary.strategyVersion}
            isSubmitting={isSubmitting}
            isRefreshing={isRefreshing}
            statusMessage={statusMessage}
            errorMessage={errorMessage}
            onRunAnalysis={handleRunAnalysis}
          />

          <OverviewConfigCard activeConfig={data.activeConfig} />

          <RiskPanel
            warnings={data.marketSummary.warnings}
            degradedAssets={data.marketSummary.degradedAssets}
            heading="风险与降级"
            emptyWarningsMessage="当前没有告警。"
            emptyDegradedAssetsMessage="当前没有降级资产。"
          />
        </div>
      </section>
    </section>
  );
}
