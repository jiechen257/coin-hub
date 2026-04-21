"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

const RESULT_FILTER_LABELS: Record<ResearchDeskResultFilter, string> = {
  all: "全部结果",
  good: "正向结果",
  neutral: "中性结果",
  bad: "逆向结果",
};

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

function FilterGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2.5 rounded-[1.25rem] border border-border/70 bg-white/72 p-3.5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.35)]">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
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
        "grid gap-3.5 rounded-[1.5rem] border border-border/70 bg-white/78 p-3.5 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.32)] backdrop-blur-sm sm:p-4",
        className,
      )}
      aria-label="研究图控制条"
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <p className="data-kicker">研究图控制条</p>
          </div>
          <h2 className="text-lg font-semibold text-foreground">标的、周期与过滤器</h2>
          <p className="support-copy text-sm">
            移动端支持横向滑动快速切片，桌面端保持完整分组，当前激活条件始终显示在顶部。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/20 bg-primary/8 text-primary">
            {selection.symbol}
          </Badge>
          <Badge variant="outline">{selection.timeframe}</Badge>
          <Badge variant={resultFilter === "all" ? "outline" : "success"}>
            {RESULT_FILTER_LABELS[resultFilter]}
          </Badge>
          {reviewTagFilter ? (
            <Badge variant="outline" className="border-accent-foreground/12 bg-accent/45">
              标签 {reviewTagFilter}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <FilterGroup
          title="行情切片"
          description="先选标的，再定周期。两个维度保持同一套交互，双端都可单手快速切换。"
        >
          <div className="grid gap-3">
            <div className="grid gap-2">
              <p className="data-kicker">标的</p>
              <div className="chip-scroll">
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
            </div>

            <div className="grid gap-2">
              <p className="data-kicker">周期</p>
              <div className="chip-scroll">
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
            </div>
          </div>
        </FilterGroup>

        <FilterGroup
          title="结果过滤"
          description="优先用结果维度缩小范围，再用标签定位复盘主题。"
        >
          <div className="grid gap-3">
            <div className="grid gap-2">
              <p className="data-kicker">结果</p>
              <div className="chip-scroll">
                {RESULT_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={resultFilter === option ? "default" : "outline"}
                    aria-pressed={resultFilter === option}
                    onClick={() => onResultFilterChange(option)}
                  >
                    {RESULT_FILTER_LABELS[option]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="data-kicker">标签</p>
              <div className="chip-scroll">
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
        </FilterGroup>
      </div>
    </section>
  );
}
