"use client";

import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { ResearchDeskCandidate } from "@/components/research-desk/research-desk-types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StrategyCandidateListProps = {
  candidates: ResearchDeskCandidate[];
  onRegenerate: () => Promise<void>;
  isLoading?: boolean;
  message?: string | null;
  error?: string | null;
};

function formatWinRate(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function getSamplePreview(rawContent: string) {
  return rawContent.replace(/\s+/g, " ").trim();
}

export function StrategyCandidateList({
  candidates,
  onRegenerate,
  isLoading = false,
  message,
  error,
}: StrategyCandidateListProps) {
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  const activeCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === activeCandidateId) ?? null,
    [activeCandidateId, candidates],
  );

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              策略区
            </p>
            <CardTitle>候选策略</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onRegenerate()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? "归纳中..." : "归纳候选策略"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {message ? (
            <Alert variant="success">
              <AlertTitle>候选策略已刷新</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>归纳失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {candidates.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
              还没有候选策略，先结算样本再归纳。
            </div>
          ) : null}

          {candidates.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-3">
              {candidates.map((candidate) => (
                <AccordionItem
                  key={candidate.id}
                  value={candidate.id}
                  className="rounded-lg border border-border/80 bg-secondary/30 px-4"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="grid min-w-0 flex-1 gap-2 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {candidate.marketContext ?? "未分类市场"}
                        </span>
                        <Badge variant="success">
                          胜率 {formatWinRate(candidate.winRate)}
                        </Badge>
                        <Badge variant="outline">样本 {candidate.sampleCount}</Badge>
                      </div>
                      <h3 className="text-sm font-semibold leading-6 text-foreground">
                        {candidate.triggerText}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        入场：{candidate.entryText}
                      </p>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-4">
                    <div className="grid gap-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-md border border-border/80 bg-background/70 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            入场规则
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {candidate.entryText}
                          </p>
                        </div>
                        <div className="rounded-md border border-border/80 bg-background/70 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            风控规则
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {candidate.riskText ?? "手动定义"}
                          </p>
                        </div>
                        <div className="rounded-md border border-border/80 bg-background/70 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            离场规则
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {candidate.exitText ?? "手动定义"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveCandidateId(candidate.id)}
                        >
                          查看样本原文
                        </Button>
                        <p className="text-xs leading-5 text-muted-foreground">
                          先看规则，样本原文收进二级弹窗。
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={activeCandidate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveCandidateId(null);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] p-0">
          <DialogHeader>
            <DialogTitle>策略样本</DialogTitle>
            <DialogDescription>
              {activeCandidate
                ? `${activeCandidate.triggerText} · ${activeCandidate.sampleCount} 条样本`
                : "查看候选策略的样本原文"}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(88vh-108px)] space-y-3 overflow-y-auto px-6 py-5">
            {activeCandidate?.sampleRefs.map((sampleRef) => (
              <article
                key={sampleRef.sampleId}
                className="space-y-3 rounded-lg border border-border/80 bg-secondary/20 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{sampleRef.traderName}</Badge>
                  <Badge variant="outline">样本 {sampleRef.sampleId.slice(0, 6)}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {getSamplePreview(sampleRef.rawContent)}
                </p>
              </article>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
