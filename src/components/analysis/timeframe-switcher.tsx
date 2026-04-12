"use client";

import type { AnalysisTimeframe } from "@/components/analysis/analysis-data";

type TimeframeSwitcherProps = {
  value: AnalysisTimeframe;
  onChange: (timeframe: AnalysisTimeframe) => void;
  disabled?: boolean;
};

const TIMEFRAMES: AnalysisTimeframe[] = ["15m", "1h", "4h", "1d"];

export function TimeframeSwitcher({
  value,
  onChange,
  disabled = false,
}: TimeframeSwitcherProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="时间周期切换">
      {TIMEFRAMES.map((timeframe) => {
        const active = timeframe === value;

        return (
          <button
            key={timeframe}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            disabled={disabled}
            onClick={() => onChange(timeframe)}
            className={[
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-sky-400/40 bg-sky-400 text-slate-950"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/40 hover:bg-sky-400/10",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {timeframe}
          </button>
        );
      })}
    </div>
  );
}
