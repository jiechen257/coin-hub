import { formatAssetStatus, formatRunMode } from "@/lib/display-text";

type RunAsset = {
  symbol: "BTC" | "ETH";
  confidence: number;
  status: string;
  evidence: string[];
};

export type RunDetailModel = {
  id: string;
  mode: string;
  strategyVersion: string;
  warnings: string[];
  assets: Record<string, RunAsset>;
  degradedAssets: string[];
  createdAt: Date;
};

type RunDetailProps = {
  run: RunDetailModel | null;
};

export function RunDetail({ run }: RunDetailProps) {
  if (!run) {
    return (
      <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        选择一条 run 记录后，这里会展示双资产输出、证据和告警。
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
            运行详情
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">已选运行</h2>
        </div>
        <div className="text-right text-sm text-slate-400">
          <p>{formatRunMode(run.mode)}</p>
          <p>{run.strategyVersion}</p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 text-sm text-slate-300 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-slate-500">运行 ID</dt>
          <dd className="mt-1 break-all text-white">{run.id}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-slate-500">创建时间</dt>
          <dd className="mt-1 text-white">
            {run.createdAt.toLocaleString("zh-CN")}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <dt className="text-slate-500">降级资产</dt>
          <dd className="mt-1 text-white">
            {run.degradedAssets.length > 0 ? run.degradedAssets.join(", ") : "无"}
          </dd>
        </div>
      </dl>

      {run.warnings.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-sm font-medium text-amber-100">告警</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
            {run.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(Object.entries(run.assets) as Array<[string, RunAsset]>).map(([symbol, asset]) => (
          <article key={symbol} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">{symbol}</h3>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                {formatAssetStatus(asset.status)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              置信度：{(asset.confidence * 100).toFixed(1)}%
            </p>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                证据
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {asset.evidence.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
