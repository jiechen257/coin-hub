import type { OverviewPayload } from "@/modules/overview/overview-service";

type OverviewConfigCardProps = {
  activeConfig: OverviewPayload["activeConfig"];
};

// 把风险比例统一成百分比文本，保证首页里的配置摘要看起来稳定且易扫读。
function formatRiskPct(value: number | null) {
  if (typeof value !== "number") {
    return "暂无";
  }

  return `${Math.round(value * 1000) / 10}%`;
}

// 生效配置卡片只展示当前真正会影响运行的摘要，不掺杂历史版本噪音。
export function OverviewConfigCard({
  activeConfig,
}: OverviewConfigCardProps) {
  const hasConfig = Boolean(activeConfig.summary || activeConfig.versionId);

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4 shadow-sm shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
            生效配置
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">配置摘要</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
          {activeConfig.versionId ?? "未生效"}
        </span>
      </div>

      {hasConfig ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <dt className="text-sm text-slate-400">摘要</dt>
            <dd className="mt-2 text-sm leading-6 text-white">
              {activeConfig.summary ?? "暂无"}
            </dd>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <dt className="text-sm text-slate-400">风险比例</dt>
            <dd className="mt-2 text-2xl font-semibold text-white">
              {formatRiskPct(activeConfig.riskPct)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
          当前没有生效配置，先去配置页创建一个版本。
        </p>
      )}
    </section>
  );
}
