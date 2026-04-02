import type { AssetAnalysis } from "@/modules/runs/result-aggregator";
import { formatAssetStatus } from "@/lib/display-text";

type AssetSignalCardProps = {
  symbol: AssetAnalysis["symbol"];
  data: AssetAnalysis;
};

export function AssetSignalCard({ symbol, data }: AssetSignalCardProps) {
  const confidencePct = Math.round(data.confidence * 100);
  const accentClass =
    symbol === "BTC"
      ? "from-amber-400/20 via-amber-400/10 to-transparent"
      : "from-sky-400/20 via-sky-400/10 to-transparent";

  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-slate-950/20 backdrop-blur">
      <div className={`rounded-2xl bg-gradient-to-br ${accentClass} p-4`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
              资产信号
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{symbol}</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-200">
            {formatAssetStatus(data.status)}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-400">置信度</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {confidencePct}%
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">证据数</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {data.evidence.length}
            </p>
          </div>
        </div>

        <ul className="mt-6 flex flex-wrap gap-2">
          {data.evidence.map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs text-slate-200"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
