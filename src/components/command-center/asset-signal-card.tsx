import { formatAssetStatus } from "@/lib/display-text";

type AssetSignalData = {
  status: string;
  confidence: number | null;
  evidence: string[];
};

type AssetSignalCardProps = {
  symbol: string;
  data: AssetSignalData;
};

// 根据资产名称挑选一个稳定的强调色，避免不同页面出现完全一样的卡片。
function getAccentClass(symbol: string) {
  if (symbol === "BTC") {
    return "from-amber-400/20 via-amber-400/10 to-transparent";
  }

  if (symbol === "ETH") {
    return "from-cyan-400/20 via-cyan-400/10 to-transparent";
  }

  return "from-sky-400/20 via-sky-400/10 to-transparent";
}

export function AssetSignalCard({ symbol, data }: AssetSignalCardProps) {
  // 置信度可能为空，因此先收敛成稳定的展示文本，再交给卡片渲染。
  const confidenceText =
    typeof data.confidence === "number"
      ? `${Math.round(data.confidence * 100)}%`
      : "—";
  const accentClass = getAccentClass(symbol);

  // 资产卡片统一展示状态、置信度和证据，让首页与命令中心复用同一套信号视图。
  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-950/20 backdrop-blur">
      <div className={`rounded-lg bg-gradient-to-br ${accentClass} p-4`}>
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
              {confidenceText}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">证据数</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {data.evidence.length}
            </p>
          </div>
        </div>

        {data.evidence.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {data.evidence.map((item, index) => (
              <li
                // 证据文本可能重复，因此把序号拼进 key，避免 React 因重复字符串复用错位。
                key={`${symbol}-${item}-${index}`}
                className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-400">
            暂时没有可展示的证据。
          </p>
        )}
      </div>
    </article>
  );
}
