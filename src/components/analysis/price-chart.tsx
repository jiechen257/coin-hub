import type {
  AnalysisCandle,
  AnalysisMarker,
  AnalysisSymbol,
  AnalysisTimeframe,
} from "@/components/analysis/analysis-data";

type PriceChartProps = {
  symbol: AnalysisSymbol;
  timeframe: AnalysisTimeframe;
  candles: AnalysisCandle[];
  structureMarkers: AnalysisMarker[];
  signalMarkers: AnalysisMarker[];
  tweetMarkers: AnalysisMarker[];
};

function getPriceBounds(candles: AnalysisCandle[]) {
  const prices = candles.flatMap((candle) => [candle.high, candle.low]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = Math.max((max - min) * 0.08, max * 0.003);

  return {
    min: min - padding,
    max: max + padding,
  };
}

function formatPrice(price: number) {
  return price >= 1000 ? price.toLocaleString("zh-CN", { maximumFractionDigits: 2 }) : price.toFixed(2);
}

function formatCompactTime(time: string) {
  const date = new Date(time);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${String(date.getUTCHours()).padStart(2, "0")}:00`;
}

export function PriceChart({
  symbol,
  timeframe,
  candles,
  structureMarkers,
  signalMarkers,
  tweetMarkers,
}: PriceChartProps) {
  if (candles.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
          {symbol} / {timeframe}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">暂无 K 线数据</h2>
        <p className="mt-3 text-sm text-slate-400">暂时没有可绘制的数据，切换资产或时间框架后会自动刷新。</p>
      </section>
    );
  }

  const width = 960;
  const height = 420;
  const padding = { top: 28, right: 22, bottom: 40, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const { min, max } = getPriceBounds(candles);
  const range = Math.max(max - min, 1);
  const step = candles.length > 1 ? chartWidth / (candles.length - 1) : chartWidth;
  const candleWidth = Math.max((chartWidth / Math.max(candles.length, 1)) * 0.55, 6);
  const indexByTime = new Map(candles.map((candle, index) => [candle.openTime, index]));
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? latest;
  const changePct = previous.close === 0 ? 0 : ((latest.close - previous.close) / previous.close) * 100;

  function xForIndex(index: number) {
    return padding.left + index * step;
  }

  function yForPrice(price: number) {
    return padding.top + ((max - price) / range) * chartHeight;
  }

  function markerY(marker: AnalysisMarker) {
    const candleIndex = indexByTime.get(marker.time) ?? candles.length - 1;
    const candle = candles[candleIndex];

    if (marker.position === "belowBar") {
      return yForPrice(candle.low) + 20;
    }

    if (marker.position === "aboveBar") {
      return yForPrice(candle.high) - 10;
    }

    return yForPrice(candle.close);
  }

  const allMarkers = [
    ...structureMarkers.map((marker) => ({ group: "结构", marker })),
    ...signalMarkers.map((marker) => ({ group: "信号", marker })),
    ...tweetMarkers.map((marker) => ({ group: "推文", marker })),
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-slate-950/30">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-sky-300/80">
            图表研究视图
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {symbol} · {timeframe}
          </h2>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
            最新收盘价
          </p>
          <p className="mt-1 text-xl font-semibold text-emerald-100">
            {formatPrice(latest.close)}
          </p>
          <p className="text-xs text-emerald-200/70">{changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[420px] w-full"
          role="img"
          aria-label={`${symbol} ${timeframe} K 线图`}
        >
          <defs>
            <linearGradient id="analysis-grid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(148,163,184,0.20)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0.04)" />
            </linearGradient>
          </defs>

          {Array.from({ length: 6 }, (_, index) => {
            const y = padding.top + (chartHeight / 5) * index;

            return (
              <g key={`grid-${index}`}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="url(#analysis-grid)" strokeWidth="1" />
                <text x={12} y={y + 4} fill="rgba(148,163,184,0.9)" fontSize="11">
                  {formatPrice(max - (range / 5) * index)}
                </text>
              </g>
            );
          })}

          {candles.map((candle, index) => {
            const x = xForIndex(index);
            const highY = yForPrice(candle.high);
            const lowY = yForPrice(candle.low);
            const openY = yForPrice(candle.open);
            const closeY = yForPrice(candle.close);
            const rising = candle.close >= candle.open;
            const color = rising ? "#34d399" : "#fb7185";
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
            const tooltip = `${formatCompactTime(candle.openTime)} 开 ${formatPrice(candle.open)} 高 ${formatPrice(candle.high)} 低 ${formatPrice(candle.low)} 收 ${formatPrice(candle.close)}`;

            return (
              <g key={candle.openTime}>
                <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth="2" />
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  rx="2"
                  fill={color}
                  opacity="0.82"
                />
                <title>{tooltip}</title>
              </g>
            );
          })}

          {allMarkers.map(({ group, marker }) => {
            const markerIndex = indexByTime.get(marker.time) ?? candles.length - 1;
            const x = xForIndex(markerIndex);
            const y = markerY(marker);
            const fill =
              marker.tone === "bullish"
                ? "#34d399"
                : marker.tone === "bearish"
                  ? "#fb7185"
                  : "#38bdf8";

            return (
              <g key={`${group}-${marker.time}-${marker.label}`} transform={`translate(${x}, ${y})`}>
                <circle r="10" fill={fill} opacity="0.9" />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#020617"
                >
                  {marker.label}
                </text>
                <title>{`${group} · ${marker.text}`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {allMarkers.map(({ group, marker }) => (
          <span
            key={`${group}-${marker.time}-${marker.label}-chip`}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200"
          >
            {group}:{` `}
            {marker.label}
            {" · "}
            {marker.text}
          </span>
        ))}
      </div>
    </section>
  );
}
