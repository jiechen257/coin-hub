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
    <div className="grid gap-1 rounded-[1rem] border border-border/80 bg-secondary/20 p-2.5">
      <p className="data-kicker">
        {title}
      </p>
      <p className="text-sm leading-5 text-foreground">{value}</p>
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
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2">
          <p className="data-kicker">结果详情</p>
          <CardTitle>结果详情</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="support-copy text-sm">
            先从本地研究图或结果过滤里选中一个 outcome。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">{formatOutcomeResultLabel(outcome.resultLabel)}</Badge>
          <Badge variant="outline">{formatOutcomeWindowType(outcome.windowType)}</Badge>
          <Badge variant="outline">规则 {outcome.ruleVersion}</Badge>
        </div>
        <div className="space-y-1.5">
          <p className="data-kicker">结果详情</p>
          <CardTitle>结果判断与回看标签</CardTitle>
        </div>
        <p className="support-copy text-sm">
          {outcome.resultReason}
        </p>
      </CardHeader>

      <CardContent className="grid gap-3.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
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

        <div className="rounded-[1.25rem] border border-border/70 bg-white/72 p-3.5">
          <div className="mb-3 space-y-0.5">
            <p className="text-sm font-semibold text-foreground">Review Tag 编辑器</p>
            <p className="text-sm leading-5 text-muted-foreground">
              先补标签，再回到总览观察过滤结果是否形成稳定主题。
            </p>
          </div>
          <ReviewTagEditor
            value={outcome.reviewTags}
            options={reviewTagOptions}
            onSave={onSaveReviewTags}
          />
        </div>
      </CardContent>
    </Card>
  );
}
