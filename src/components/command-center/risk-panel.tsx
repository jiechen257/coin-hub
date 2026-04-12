type RiskPanelProps = {
  warnings: string[];
  degradedAssets: string[];
  heading?: string;
  emptyWarningsMessage?: string;
  emptyDegradedAssetsMessage?: string;
};

export function RiskPanel({
  warnings,
  degradedAssets,
  heading = "运行风险",
  emptyWarningsMessage = "当前没有告警。",
  emptyDegradedAssetsMessage = "当前监控资产都高于置信度下限。",
}: RiskPanelProps) {
  const hasWarnings = warnings.length > 0;
  const hasDegradedAssets = degradedAssets.length > 0;

  // 风险面板把告警与降级资产并列展示，保证首页和命令中心都能快速定位异常来源。
  return (
    <aside className="rounded-lg border border-white/10 bg-slate-950/50 p-4 shadow-lg shadow-slate-950/20 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
        风险面板
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">{heading}</h3>

      <div className="mt-5 space-y-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-400">告警</p>
          {hasWarnings ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {warnings.map((warning, index) => (
                <li
                  // 告警文本不保证唯一，因此把序号拼进 key，避免重复文案导致的重复 key。
                  key={`${warning}-${index}`}
                  className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2"
                >
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-200">{emptyWarningsMessage}</p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-400">降级资产</p>
          {hasDegradedAssets ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {degradedAssets.map((asset, index) => (
                <span
                  // 降级资产列表也可能出现重复值，因此需要稳定且不冲突的 key。
                  key={`${asset}-${index}`}
                  className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-100"
                >
                  {asset}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-200">
              {emptyDegradedAssetsMessage}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
