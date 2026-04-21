"use client";

import type {
  ResearchDeskOutcome,
  ResearchDeskReviewTagOption,
} from "@/components/research-desk/research-desk-types";
import {
  formatOutcomeResultLabel,
  formatOutcomeWindowType,
} from "@/components/research-desk/outcome-copy";
import { ReviewTagEditor } from "@/components/research-desk/review-tag-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OutcomeDetailProps = {
  outcome: ResearchDeskOutcome | null;
  reviewTagOptions: ResearchDeskReviewTagOption[];
  onSaveReviewTags: (reviewTags: string[]) => Promise<void>;
};

function formatPercent(value: number | null) {
  return value === null ? "未计算" : `${value.toFixed(2)}%`;
}

function DetailField({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 rounded-md border border-border/80 bg-secondary/20 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <p className="text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

export function OutcomeDetail({
  outcome,
  reviewTagOptions,
  onSaveReviewTags,
}: OutcomeDetailProps) {
  if (!outcome) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>结果详情</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            先从本地研究图或结果过滤里选中一个 outcome。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{formatOutcomeResultLabel(outcome.resultLabel)}</Badge>
          <Badge variant="outline">{formatOutcomeWindowType(outcome.windowType)}</Badge>
          <Badge variant="outline">规则 {outcome.ruleVersion}</Badge>
        </div>
        <CardTitle>结果详情</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {outcome.resultReason}
        </p>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField
            title="最大顺向波动"
            value={formatPercent(outcome.maxFavorableExcursionPercent)}
          />
          <DetailField
            title="最大逆向波动"
            value={formatPercent(outcome.maxAdverseExcursionPercent)}
          />
          <DetailField
            title="当前 Review Tags"
            value={
              outcome.reviewTags.length > 0
                ? outcome.reviewTags.join(" / ")
                : "暂未标注"
            }
          />
        </div>

        <ReviewTagEditor
          value={outcome.reviewTags}
          options={reviewTagOptions}
          onSave={onSaveReviewTags}
        />
      </CardContent>
    </Card>
  );
}
