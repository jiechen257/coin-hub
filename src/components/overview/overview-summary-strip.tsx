import type { OverviewPayload } from "@/modules/overview/overview-service";

type OverviewSummaryStripProps = {
  marketSummary: OverviewPayload["marketSummary"];
};

// 将 UTC 时间字符串格式化成稳定的控制台展示文本，避免时区差异影响首页内容。
function formatUtcDateTime(value: string | null) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "暂无";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

// 首页顶部的摘要条只放最关键的控制信号，帮助用户一眼定位当前策略状态。
export function OverviewSummaryStrip({
  marketSummary,
}: OverviewSummaryStripProps) {
  const items = [
    {
      label: "运行策略版本",
      value: marketSummary.strategyVersion ?? "暂无",
      tone: "text-white",
    },
    {
      label: "最近运行时间",
      value: formatUtcDateTime(marketSummary.latestRunAt),
      tone: "text-sky-200",
    },
    {
      label: "告警数量",
      value: String(marketSummary.warnings.length),
      tone: "text-amber-200",
    },
    {
      label: "降级资产数",
      value: String(marketSummary.degradedAssets.length),
      tone: "text-rose-200",
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-lg border border-white/10 bg-slate-950/60 p-4 shadow-sm shadow-slate-950/20"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {item.label}
          </p>
          <p className={`mt-3 text-2xl font-semibold ${item.tone}`}>
            {item.value}
          </p>
        </article>
      ))}
    </section>
  );
}
