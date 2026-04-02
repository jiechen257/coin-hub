import type { AnalysisSignal, AnalysisViewpoint } from "@/components/analysis/analysis-data";
import { formatSignalBias } from "@/lib/display-text";

type EvidencePanelProps = {
  signal: AnalysisSignal;
  warnings: string[];
  viewpoints?: AnalysisViewpoint[];
};

export function EvidencePanel({
  signal,
  warnings,
  viewpoints = [],
}: EvidencePanelProps) {
  const confidencePct = Math.round(signal.confidence * 100);

  return (
    <aside className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-slate-950/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
            证据面板
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {signal.symbol} 信号
          </h2>
          <p className="mt-2 text-sm text-slate-400">{signal.summary}</p>
        </div>
        <span
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.25em]",
            signal.bias === "long"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-amber-400/30 bg-amber-400/10 text-amber-100",
          ].join(" ")}
        >
          {formatSignalBias(signal.bias)}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">置信度</p>
          <p className="mt-2 text-3xl font-semibold text-white">{confidencePct}%</p>
          <p className="mt-1 text-sm text-slate-400">由结构偏向和证据密度共同驱动。</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">证据数</p>
          <p className="mt-2 text-3xl font-semibold text-white">{signal.evidence.length}</p>
          <p className="mt-1 text-sm text-slate-400">顶部证据会同步进入信号载荷。</p>
        </div>
      </div>

      <section className="mt-6">
        <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">信号证据</h3>
        <ul className="mt-3 space-y-2">
          {signal.evidence.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">告警</h3>
        <ul className="mt-3 space-y-2">
          {warnings.length > 0 ? (
            warnings.map((warning, index) => (
              <li
                key={`${index}-${warning}`}
                className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50"
              >
                {warning}
              </li>
            ))
          ) : (
            <li className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
              当前没有告警。
            </li>
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-sm uppercase tracking-[0.3em] text-slate-400">最新观点</h3>
        <div className="mt-3 space-y-3">
          {viewpoints.length > 0 ? (
            viewpoints.map((viewpoint) => (
              <article
                key={viewpoint.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{viewpoint.author}</p>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.25em] text-slate-300">
                    {viewpoint.bias}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {viewpoint.reasoning ?? viewpoint.text}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              暂时没有可展示的观点，先切换资产或时间框架。
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}
