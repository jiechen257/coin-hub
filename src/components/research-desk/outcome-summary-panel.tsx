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

export function OutcomeSummaryPanel({
  summary,
  resultFilter,
  filteredCount,
  reviewTagFilter = null,
}: OutcomeSummaryPanelProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            结果总览
          </p>
          <CardTitle>结果分布</CardTitle>
        </div>

        <div className="rounded-md border border-border/80 bg-secondary/20 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            {buildFilteredCopy(resultFilter, filteredCount)}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {reviewTagFilter
              ? `当前标签过滤：${reviewTagFilter}`
              : "待补齐会保留为技术状态，不进入首屏结果过滤按钮。"}
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border/80 bg-secondary/20 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {formatOutcomeResultLabel("good")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {summary.counts.good}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/20 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {formatOutcomeResultLabel("neutral")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {summary.counts.neutral}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/20 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {formatOutcomeResultLabel("bad")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {summary.counts.bad}
            </p>
          </div>
          <div className="rounded-md border border-border/80 bg-secondary/20 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {formatOutcomeResultLabel("pending")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {summary.counts.pending}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">标签热度</h3>
            <Badge variant="outline">{summary.reviewTags.length} 项</Badge>
          </div>

          {summary.reviewTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summary.reviewTags.map((tag) => (
                <Badge key={tag.label} variant="outline" className="rounded-md">
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
