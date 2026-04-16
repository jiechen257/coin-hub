"use client";

import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RecordListProps = {
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  onSelect: (recordId: string) => void;
};

function formatOccurredAt(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRecordPreview(record: ResearchDeskRecord) {
  return (
    record.notes ??
    record.executionPlans[0]?.triggerText ??
    record.rawContent
  );
}

export function RecordList({
  records,
  selectedRecordId,
  onSelect,
}: RecordListProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>最近记录</CardTitle>
        <Badge variant="outline">{records.length} 条</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {records.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
            还没有交易员记录。
          </div>
        ) : null}

        {records.map((record) => {
          const active = record.id === selectedRecordId;

          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
              className={cn(
                "group grid w-full gap-2 rounded-md border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
                active
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/80 bg-secondary/30 hover:border-primary/25 hover:bg-accent/70",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {record.trader.name}
                </span>
                <Badge variant={active ? "success" : "outline"}>
                  {record.symbol} · {record.recordType}
                </Badge>
              </div>

              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                {getRecordPreview(record)}
              </p>

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{formatOccurredAt(record.occurredAt)}</span>
                <span>{record.executionPlans.length} 个方案</span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
