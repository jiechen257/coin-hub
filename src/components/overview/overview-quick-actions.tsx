"use client";

import Link from "next/link";

type OverviewQuickActionsProps = {
  strategyVersion: string | null;
  isSubmitting: boolean;
  isRefreshing: boolean;
  statusMessage: string | null;
  errorMessage: string | null;
  onRunAnalysis: () => Promise<void>;
};

// 快速操作区把最常用的动作收进同一行，按钮和链接都保持很短，避免首页像宣传页。
export function OverviewQuickActions({
  strategyVersion,
  isSubmitting,
  isRefreshing,
  statusMessage,
  errorMessage,
  onRunAnalysis,
}: OverviewQuickActionsProps) {
  const isBusy = isSubmitting || isRefreshing;

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/70 p-4 shadow-sm shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
            快速操作
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">控制入口</h2>
        </div>
        <p className="text-sm text-slate-400">
          当前策略 {strategyVersion ?? "暂无"}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            void onRunAnalysis();
          }}
          disabled={isBusy}
          className="rounded-md border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-left text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
        >
          <span
            className="block text-xs uppercase tracking-[0.25em] text-sky-200/70"
            aria-hidden="true"
          >
            动作
          </span>
          <span className="mt-1 block text-base text-white">
            {isSubmitting ? "运行分析中" : "运行分析"}
          </span>
        </button>

        <Link
          href="/replay"
          className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <span
            className="block text-xs uppercase tracking-[0.25em] text-slate-500"
            aria-hidden="true"
          >
            动作
          </span>
          <span className="mt-1 block text-base">提交回放</span>
        </Link>

        <Link
          href="/analysis"
          className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <span
            className="block text-xs uppercase tracking-[0.25em] text-slate-500"
            aria-hidden="true"
          >
            页面
          </span>
          <span className="mt-1 block text-base">查看分析</span>
        </Link>

        <Link
          href="/runs"
          className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <span
            className="block text-xs uppercase tracking-[0.25em] text-slate-500"
            aria-hidden="true"
          >
            页面
          </span>
          <span className="mt-1 block text-base">运行历史</span>
        </Link>

        <Link
          href="/config"
          className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <span
            className="block text-xs uppercase tracking-[0.25em] text-slate-500"
            aria-hidden="true"
          >
            页面
          </span>
          <span className="mt-1 block text-base">查看配置</span>
        </Link>
      </div>

      <div
        className="mt-4 min-h-10 space-y-2 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage ? (
          <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
            {statusMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-rose-100">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
