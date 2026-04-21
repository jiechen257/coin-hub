"use client";

import type {
  ResearchDeskOutcomeAggregates,
  ResearchDeskResultFilter,
  ResearchDeskReviewTagFilter,
} from "@/components/research-desk/research-desk-types";
import {
  formatOutcomeResultFilter,
  formatOutcomeResultLabel,
} from "@/components/research-desk/outcome-copy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type OutcomeSummaryPanelProps = {
  summary: ResearchDeskOutcomeAggregates;
  resultFilter: ResearchDeskResultFilter;
  filteredCount: number;
  reviewTagFilter?: ResearchDeskReviewTagFilter;
};

function buildFilteredCopy(
  resultFilter: ResearchDeskResultFilter,
  filteredCount: number,
) {
  if (resultFilter === "all") {
    return `${filteredCount} 条结果`;
  }

  return `${filteredCount} 条${formatOutcomeResultFilter(resultFilter)}结果`;
}

function buildSummaryItems(summary: ResearchDeskOutcomeAggregates) {
  const total = Math.max(summary.counts.total, 1);

  return [
    {
      key: "good",
      label: formatOutcomeResultLabel("good"),
      count: summary.counts.good,
      className: "border-emerald-200/80 bg-emerald-50/90",
    },
    {
      key: "neutral",
      label: formatOutcomeResultLabel("neutral"),
      count: summary.counts.neutral,
      className: "border-sky-200/80 bg-sky-50/90",
    },
    {
      key: "bad",
      label: formatOutcomeResultLabel("bad"),
      count: summary.counts.bad,
      className: "border-rose-200/80 bg-rose-50/90",
    },
    {
      key: "pending",
      label: formatOutcomeResultLabel("pending"),
      count: summary.counts.pending,
      className: "border-slate-200/90 bg-slate-50/90",
    },
  ].map((item) => ({
    ...item,
    ratio: `${Math.round((item.count / total) * 100)}%`,
  }));
}

export function OutcomeSummaryPanel({
  summary,
  resultFilter,
  filteredCount,
  reviewTagFilter = null,
}: OutcomeSummaryPanelProps) {
  const summaryItems = buildSummaryItems(summary);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2.5">
        <div className="space-y-1.5">
          <p className="data-kicker">结果总览</p>
          <CardTitle>结果分布</CardTitle>
        </div>

        <div className="rounded-[1.25rem] border border-border/70 bg-secondary/35 px-3.5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              {buildFilteredCopy(resultFilter, filteredCount)}
            </p>
            <Badge variant="outline">{summary.counts.total} 条总结果</Badge>
          </div>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
            {reviewTagFilter
              ? `当前标签过滤：${reviewTagFilter}`
              : "待补齐结果会保留为技术状态，继续在详情区完成 review tag 标注。"}
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {summaryItems.map((item) => (
            <div
              key={item.key}
              className={cn(
                "rounded-[1.25rem] border p-3.5 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.45)]",
                item.className,
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </p>
                <span className="text-xs font-medium text-muted-foreground">
                  {item.ratio}
                </span>
              </div>
              <p className="mt-2 text-[1.65rem] font-semibold tracking-tight text-foreground">
                {item.count}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2.5 rounded-[1.25rem] border border-border/70 bg-white/75 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">标签热度</h3>
            <Badge variant="outline">{summary.reviewTags.length} 项</Badge>
          </div>

          {summary.reviewTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summary.reviewTags.map((tag) => (
                <Badge
                  key={tag.label}
                  variant="outline"
                  className="rounded-full border-border/70 bg-secondary/35 px-3 py-1"
                >
                  {tag.label} {tag.count}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              当前筛选结果还没有 review tag。
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
