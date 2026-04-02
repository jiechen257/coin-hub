type RiskPanelProps = {
  warnings: string[];
  degradedAssets: string[];
};

export function RiskPanel({ warnings, degradedAssets }: RiskPanelProps) {
  const hasWarnings = warnings.length > 0;
  const hasDegradedAssets = degradedAssets.length > 0;

  return (
    <aside className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-lg shadow-slate-950/20 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
        风险面板
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">运行风险</h3>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-400">告警</p>
          {hasWarnings ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {warnings.map((warning) => (
                <li
                  key={warning}
                  className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2"
                >
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-200">
              当前没有告警。
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-400">降级资产</p>
          {hasDegradedAssets ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {degradedAssets.map((asset) => (
                <span
                  key={asset}
                  className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-100"
                >
                  {asset}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-200">
              当前监控资产都高于置信度下限。
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
