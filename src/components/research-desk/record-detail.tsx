"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";
import { RecordDetailInsights } from "@/components/research-desk/record-detail-insights";
import { formatRecordTimeRange } from "@/components/research-desk/record-time-range";
import { formatPlanSide } from "@/components/research-desk/record-detail-utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RecordDetailProps = {
  record: ResearchDeskRecord | null;
  onSettlePlan: (input: {
    planId: string;
    entryPrice: number;
    exitPrice: number;
    settledAt: string;
    notes?: string;
  }) => Promise<void>;
};

type SettleDraft = {
  entryPrice: string;
  exitPrice: string;
  settledAt: string;
};

function toLocalDateTimeValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function buildDraft(
  plan: ResearchDeskRecord["executionPlans"][number],
): SettleDraft {
  return {
    entryPrice: plan.entryPrice?.toString() ?? "",
    exitPrice: plan.exitPrice?.toString() ?? "",
    settledAt: toLocalDateTimeValue(),
  };
}

function formatPlanStatus(recordType: ResearchDeskRecord["recordType"]) {
  return recordType === "trade" ? "真实开单" : "行情观点";
}

function DetailBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="grid gap-1 rounded-[1rem] border border-border/80 bg-secondary/20 p-2.5">
      <p className="data-kicker">
        {title}
      </p>
      <p className="text-sm leading-5 text-muted-foreground">{content}</p>
    </div>
  );
}

export function RecordDetail({ record, onSettlePlan }: RecordDetailProps) {
  const [settleMessage, setSettleMessage] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settlingPlanId, setSettlingPlanId] = useState<string | null>(null);
  const [expandedSettlePlanId, setExpandedSettlePlanId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SettleDraft>>({});

  useEffect(() => {
    setDrafts({});
    setSettleMessage(null);
    setSettleError(null);
    setExpandedSettlePlanId(null);
  }, [record?.id]);

  if (!record) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2">
          <p className="data-kicker">记录详情</p>
          <CardTitle>记录详情</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="support-copy text-sm">
            选中结果条或最近记录后，这里会显示对应方案和样本状态。
          </p>
        </CardContent>
      </Card>
    );
  }

  function getDraft(plan: ResearchDeskRecord["executionPlans"][number]) {
    return drafts[plan.id] ?? buildDraft(plan);
  }

  function updateDraft(
    planId: string,
    patch: Partial<SettleDraft>,
    fallbackPlan?: ResearchDeskRecord["executionPlans"][number],
  ) {
    setDrafts((current) => ({
      ...current,
      [planId]: {
        ...(current[planId] ??
          (fallbackPlan
            ? buildDraft(fallbackPlan)
            : {
                entryPrice: "",
                exitPrice: "",
                settledAt: toLocalDateTimeValue(),
              })),
        ...patch,
      },
    }));
  }

  async function handleSettlePlan(plan: ResearchDeskRecord["executionPlans"][number]) {
    const draft = getDraft(plan);

    setSettlingPlanId(plan.id);
    setSettleError(null);
    setSettleMessage(null);

    try {
      await onSettlePlan({
        planId: plan.id,
        entryPrice: Number(draft.entryPrice || plan.entryPrice || 0),
        exitPrice: Number(draft.exitPrice || plan.exitPrice || 0),
        settledAt: new Date(draft.settledAt).toISOString(),
      });
      setSettleMessage(`已结算方案 ${plan.label}`);
      setDrafts((current) => ({
        ...current,
        [plan.id]: buildDraft(plan),
      }));
    } catch (error) {
      setSettleError(error instanceof Error ? error.message : "结算失败");
    } finally {
      setSettlingPlanId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2.5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{record.symbol}</Badge>
            <Badge variant="outline">{formatPlanStatus(record.recordType)}</Badge>
            <Badge variant="outline">{record.sourceType}</Badge>
            {record.timeframe ? <Badge variant="outline">{record.timeframe}</Badge> : null}
          </div>
          <p className="data-kicker">记录详情</p>
          <CardTitle>{record.trader.name}</CardTitle>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          记录区间 {formatRecordTimeRange(record)}
        </p>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {settleMessage ? (
          <Alert variant="success">
            <AlertTitle>样本已更新</AlertTitle>
            <AlertDescription>{settleMessage}</AlertDescription>
          </Alert>
        ) : null}

        {settleError ? (
          <Alert variant="destructive">
            <AlertTitle>结算失败</AlertTitle>
            <AlertDescription>{settleError}</AlertDescription>
          </Alert>
        ) : null}

        <RecordDetailInsights record={record} />

        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">情景推演</h3>
            <Badge variant="outline">{record.executionPlans.length} 个方案</Badge>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {record.executionPlans.map((plan) => {
              const draft = getDraft(plan);
              const isSettling = settlingPlanId === plan.id;
              const isSettleExpanded = expandedSettlePlanId === plan.id;

              return (
                <AccordionItem
                  key={plan.id}
                  value={plan.id}
                  className="rounded-[1.25rem] border border-border/80 bg-secondary/30 px-4"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="grid min-w-0 flex-1 gap-2 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">
                          {plan.label}
                        </span>
                        <Badge variant="outline">{formatPlanSide(plan.side)}</Badge>
                        <Badge variant="outline">{plan.status}</Badge>
                        <Badge variant={plan.sample ? "success" : "outline"}>
                          {plan.sample ? "已结算" : "待结算"}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {plan.triggerText}
                      </p>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-4">
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailBlock title="触发" content={plan.triggerText} />
                        <DetailBlock title="入场" content={plan.entryText} />
                        {plan.riskText ? (
                          <DetailBlock title="风控" content={plan.riskText} />
                        ) : null}
                        {plan.exitText ? (
                          <DetailBlock title="离场" content={plan.exitText} />
                        ) : null}
                      </div>

                      {plan.sample ? (
                        <div className="grid gap-3">
                          <Alert variant="success">
                            <AlertTitle>样本已结算</AlertTitle>
                            <AlertDescription>
                              收益 {plan.sample.pnlValue} / {plan.sample.pnlPercent.toFixed(2)}%
                            </AlertDescription>
                          </Alert>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <DetailBlock
                              title="开仓 / 平仓"
                              content={`${plan.sample.entryPrice} -> ${plan.sample.exitPrice}`}
                            />
                            <DetailBlock
                              title="持仓时长"
                              content={`${plan.sample.holdingMinutes} 分钟`}
                            />
                            <DetailBlock
                              title="结果标签"
                              content={plan.sample.resultTag}
                            />
                            <DetailBlock
                              title="最大回撤"
                              content={
                                plan.sample.maxDrawdownPercent === null
                                  ? "未记录"
                                  : `${plan.sample.maxDrawdownPercent.toFixed(2)}%`
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3 rounded-[1.25rem] border border-border/80 bg-card/70 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {plan.entryPrice !== null ? (
                              <Badge variant="outline">计划开仓 {plan.entryPrice}</Badge>
                            ) : null}
                            {plan.exitPrice !== null ? (
                              <Badge variant="outline">计划平仓 {plan.exitPrice}</Badge>
                            ) : null}
                            {plan.stopLoss !== null ? (
                              <Badge variant="outline">止损 {plan.stopLoss}</Badge>
                            ) : null}
                            {plan.takeProfit !== null ? (
                              <Badge variant="outline">止盈 {plan.takeProfit}</Badge>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setExpandedSettlePlanId((current) =>
                                  current === plan.id ? null : plan.id,
                                )
                              }
                            >
                              {isSettleExpanded ? "收起结算表单" : "录入结算"}
                            </Button>
                          </div>

                          {isSettleExpanded ? (
                            <div className="grid gap-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label htmlFor={`entry-${plan.id}`}>开仓参考价</Label>
                                  <Input
                                    id={`entry-${plan.id}`}
                                    aria-label="开仓参考价"
                                    type="number"
                                    inputMode="decimal"
                                    value={draft.entryPrice}
                                    onChange={(event) =>
                                      updateDraft(
                                        plan.id,
                                        { entryPrice: event.target.value },
                                        plan,
                                      )
                                    }
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor={`exit-${plan.id}`}>平仓参考价</Label>
                                  <Input
                                    id={`exit-${plan.id}`}
                                    aria-label="平仓参考价"
                                    type="number"
                                    inputMode="decimal"
                                    value={draft.exitPrice}
                                    onChange={(event) =>
                                      updateDraft(
                                        plan.id,
                                        { exitPrice: event.target.value },
                                        plan,
                                      )
                                    }
                                  />
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`settled-at-${plan.id}`}>结算时间</Label>
                                <Input
                                  id={`settled-at-${plan.id}`}
                                  aria-label="结算时间"
                                  type="datetime-local"
                                  value={draft.settledAt}
                                  onChange={(event) =>
                                    updateDraft(
                                      plan.id,
                                      { settledAt: event.target.value },
                                      plan,
                                    )
                                  }
                                />
                              </div>

                              <Button
                                type="button"
                                onClick={() => void handleSettlePlan(plan)}
                                disabled={isSettling}
                                className="w-full sm:w-auto"
                              >
                                {isSettling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                {isSettling ? "结算中..." : "结算样本"}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs leading-5 text-muted-foreground">
                              先浏览方案内容，需要沉淀成样本时再展开结算表单。
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      </CardContent>
    </Card>
  );
}
