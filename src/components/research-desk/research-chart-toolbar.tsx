"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ResearchDeskResultFilter,
  ResearchDeskSelection,
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
  ResearchDeskReviewTagFilter,
  ResearchDeskReviewTagOption,
} from "@/components/research-desk/research-desk-types";

const SYMBOL_OPTIONS: ResearchDeskSymbol[] = ["BTC", "ETH"];
const TIMEFRAME_OPTIONS: ResearchDeskTimeframe[] = ["15m", "1h", "4h", "1d"];
const RESULT_FILTER_OPTIONS: ResearchDeskResultFilter[] = [
  "all",
  "good",
  "neutral",
  "bad",
];

type ResearchChartToolbarProps = {
  selection: ResearchDeskSelection;
  onSelectionChange: (selection: ResearchDeskSelection) => void;
  resultFilter: ResearchDeskResultFilter;
  onResultFilterChange: (resultFilter: ResearchDeskResultFilter) => void;
  reviewTagFilter: ResearchDeskReviewTagFilter;
  reviewTagOptions: ResearchDeskReviewTagOption[];
  onReviewTagFilterChange: (reviewTagFilter: ResearchDeskReviewTagFilter) => void;
  className?: string;
  symbols?: ResearchDeskSymbol[];
  timeframes?: ResearchDeskTimeframe[];
};

function buildButtonVariant(isActive: boolean) {
  return isActive ? "default" : "outline";
}

export function ResearchChartToolbar({
  selection,
  onSelectionChange,
  resultFilter,
  onResultFilterChange,
  reviewTagFilter,
  reviewTagOptions,
  onReviewTagFilterChange,
  className,
  symbols = SYMBOL_OPTIONS,
  timeframes = TIMEFRAME_OPTIONS,
}: ResearchChartToolbarProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border/80 bg-card/95 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.18)]",
        className,
      )}
      aria-label="研究图控制条"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            研究图控制条
          </p>
          <h2 className="text-base font-semibold text-foreground">
            标的与周期
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {symbols.map((symbol) => (
            <Button
              key={symbol}
              type="button"
              size="sm"
              variant={buildButtonVariant(selection.symbol === symbol)}
              aria-pressed={selection.symbol === symbol}
              onClick={() => onSelectionChange({ ...selection, symbol })}
            >
              {symbol}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe}
              type="button"
              size="sm"
              variant={buildButtonVariant(selection.timeframe === timeframe)}
              aria-pressed={selection.timeframe === timeframe}
              onClick={() => onSelectionChange({ ...selection, timeframe })}
            >
              {timeframe}
            </Button>
          ))}
        </div>

        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            结果过滤
          </p>
          <div className="flex flex-wrap gap-2">
            {RESULT_FILTER_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={resultFilter === option ? "default" : "outline"}
                aria-pressed={resultFilter === option}
                onClick={() => onResultFilterChange(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            标签过滤
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={reviewTagFilter === null ? "default" : "outline"}
              aria-pressed={reviewTagFilter === null}
              onClick={() => onReviewTagFilterChange(null)}
            >
              全部标签
            </Button>
            {reviewTagOptions.map((option) => (
              <Button
                key={option.label}
                type="button"
                size="sm"
                variant={reviewTagFilter === option.label ? "default" : "outline"}
                aria-pressed={reviewTagFilter === option.label}
                onClick={() => onReviewTagFilterChange(option.label)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
