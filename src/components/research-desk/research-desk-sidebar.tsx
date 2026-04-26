"use client";

import { Archive, CheckCircle2, CirclePlay, ListChecks } from "lucide-react";
import { RecordComposerDialog } from "@/components/research-desk/record-composer-dialog";
import { RECORD_STATUS_ACTION_LABELS, RECORD_STATUS_LABELS, getRecordStatusAction } from "@/modules/records/record-status";
import type {
  ResearchDeskOutcomeAggregates,
  ResearchDeskRecord,
  ResearchDeskRecordStatus,
  ResearchDeskTrader,
  ResearchDeskPayload,
} from "@/components/research-desk/research-desk-types";
import type { CreateRecordRequest } from "@/components/research-desk/record-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResearchDeskSidebarProps = {
  traders: ResearchDeskTrader[];
  records: ResearchDeskRecord[];
  selectedRecord: ResearchDeskRecord | null;
  selectedRecordId: string | null;
  summary: ResearchDeskOutcomeAggregates;
  databaseRuntime: ResearchDeskPayload["databaseRuntime"];
  selectorMode: "active" | "archive";
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
  onSelectRecord: (recordId: string) => void;
  onSetRecordStatus: (
    recordId: string,
    status: Exclude<ResearchDeskRecordStatus, "archived">,
  ) => Promise<void>;
  onArchiveRecord: (recordId: string) => Promise<void>;
};

function buildRecordOptionLabel(record: ResearchDeskRecord) {
  const status = record.status ?? "not_started";

  return `${record.trader.name} · ${record.symbol} · ${
    RECORD_STATUS_LABELS[status]
  }`;
}

function countByStatus(records: ResearchDeskRecord[]) {
  return records.reduce(
    (counts, record) => ({
      ...counts,
      [record.status ?? "not_started"]: counts[record.status ?? "not_started"] + 1,
    }),
    {
      not_started: 0,
      in_progress: 0,
      ended: 0,
      archived: 0,
    } satisfies Record<ResearchDeskRecordStatus, number>,
  );
}

function getNextStatusForAction(action: ReturnType<typeof getRecordStatusAction>) {
  switch (action) {
    case "start":
      return "in_progress";
    case "end":
      return "ended";
    default:
      return null;
  }
}

function getDatabaseRuntimeBadgeVariant(
  tone: ResearchDeskPayload["databaseRuntime"]["tone"],
) {
  return tone === "danger" ? "destructive" : tone === "warning" ? "outline" : "default";
}

export function ResearchDeskSidebar({
  traders,
  records,
  selectedRecord,
  selectedRecordId,
  summary,
  databaseRuntime,
  selectorMode,
  onCreateTrader,
  onCreateRecord,
  onSelectRecord,
  onSetRecordStatus,
  onArchiveRecord,
}: ResearchDeskSidebarProps) {
  const counts = countByStatus(records);
  const selectedStatus = selectedRecord?.status ?? "not_started";
  const selectedCompletion = selectedRecord?.completion ?? {
    missingBasics: [],
    missingPlans: [],
    missingReview: [],
    score: 100,
  };
  const statusAction = selectedRecord
    ? getRecordStatusAction(selectedStatus)
    : null;
  const nextStatus = getNextStatusForAction(statusAction);

  return (
    <Card className="overflow-hidden border-primary/10 bg-white/88 shadow-[0_20px_56px_-36px_rgba(15,23,42,0.45)]">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="data-kicker">公共工作栏</p>
            <CardTitle className="mt-1">记录选择与状态</CardTitle>
          </div>
          <Badge variant="outline">
            {selectorMode === "archive" ? "归档集合" : "工作集合"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 text-sm">
          <span className="text-muted-foreground">数据源：</span>
          <Badge variant={getDatabaseRuntimeBadgeVariant(databaseRuntime.tone)}>
            {databaseRuntime.label}
          </Badge>
        </div>
        <RecordComposerDialog
          traders={traders}
          onCreateTrader={onCreateTrader}
          onCreateRecord={onCreateRecord}
        />
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-medium text-foreground">顶部记录选择</p>
          <Select
            value={selectedRecordId ?? ""}
            onValueChange={(value) => {
              if (value) {
                onSelectRecord(value);
              }
            }}
          >
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="选择记录" />
            </SelectTrigger>
            <SelectContent>
              {records.map((record) => (
                <SelectItem key={record.id} value={record.id}>
                  {buildRecordOptionLabel(record)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/70 bg-secondary/25 p-3">
            <p className="data-kicker">进行中</p>
            <p className="mt-2 text-2xl font-semibold">{counts.in_progress}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/25 p-3">
            <p className="data-kicker">尚未开始</p>
            <p className="mt-2 text-2xl font-semibold">{counts.not_started}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/25 p-3">
            <p className="data-kicker">已结束</p>
            <p className="mt-2 text-2xl font-semibold">{counts.ended}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/25 p-3">
            <p className="data-kicker">已归档</p>
            <p className="mt-2 text-2xl font-semibold">{counts.archived}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-border/70 bg-card/80 p-3.5">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">当前记录</p>
          </div>
          {selectedRecord ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{selectedRecord.trader.name}</Badge>
                <Badge variant="outline">{selectedRecord.symbol}</Badge>
                <Badge variant="success">
                  {RECORD_STATUS_LABELS[selectedStatus]}
                </Badge>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                {selectedRecord.rawContent}
              </p>
              <div className="grid gap-1.5 text-xs leading-5 text-muted-foreground">
                {[
                  ...selectedCompletion.missingBasics,
                  ...selectedCompletion.missingPlans,
                  ...selectedCompletion.missingReview,
                ]
                  .slice(0, 4)
                  .map((item) => (
                    <span key={item}>待补齐：{item}</span>
                  ))}
                {selectedCompletion.score >= 100 ? (
                  <span className="text-emerald-700">补齐度完成</span>
                ) : null}
              </div>
              {statusAction ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (statusAction === "archive") {
                      void onArchiveRecord(selectedRecord.id);
                      return;
                    }

                    if (nextStatus) {
                      void onSetRecordStatus(selectedRecord.id, nextStatus);
                    }
                  }}
                >
                  {statusAction === "archive" ? (
                    <Archive className="h-4 w-4" />
                  ) : statusAction === "end" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <CirclePlay className="h-4 w-4" />
                  )}
                  {RECORD_STATUS_ACTION_LABELS[statusAction]}
                </Button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">暂无可选记录。</p>
          )}
        </div>

        <div className="grid gap-2 rounded-xl border border-border/70 bg-secondary/20 p-3.5">
          <p className="text-sm font-semibold text-foreground">结果总览</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span>good {summary.counts.good}</span>
            <span>neutral {summary.counts.neutral}</span>
            <span>bad {summary.counts.bad}</span>
            <span>pending {summary.counts.pending}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
