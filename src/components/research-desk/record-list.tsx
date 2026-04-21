"use client";

import { Archive } from "lucide-react";
import { RecordEditorDialog } from "@/components/research-desk/record-editor-dialog";
import { formatRecordTimeRange } from "@/components/research-desk/record-time-range";
import type {
  ResearchDeskRecord,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import type {
  CreateRecordRequest,
  UpdateRecordRequest,
} from "@/components/research-desk/record-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RecordListProps = {
  traders: ResearchDeskTrader[];
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  onSelect: (recordId: string) => void;
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
  onUpdateRecord: (recordId: string, input: UpdateRecordRequest) => Promise<void>;
  onArchiveRecord: (recordId: string) => Promise<void>;
};

function getRecordPreview(record: ResearchDeskRecord) {
  return (
    record.notes ??
    record.executionPlans[0]?.triggerText ??
    record.rawContent
  );
}

export function RecordList({
  traders,
  records,
  selectedRecordId,
  onSelect,
  onCreateTrader,
  onCreateRecord,
  onUpdateRecord,
  onArchiveRecord,
}: RecordListProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>最近记录</CardTitle>
        <Badge variant="outline">{records.length} 条</Badge>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {records.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
            还没有交易员记录。
          </div>
        ) : null}

        {records.map((record) => {
          const active = record.id === selectedRecordId;

          return (
            <div
              key={record.id}
              className={cn(
                "grid gap-2.5 rounded-[1.25rem] border px-3.5 py-3.5 transition-[border-color,background-color,box-shadow]",
                active
                  ? "border-primary/25 bg-primary/10 shadow-[0_18px_30px_-26px_rgba(14,165,233,0.7)]"
                  : "border-border/80 bg-secondary/22 hover:border-primary/20 hover:bg-accent/55",
              )}
            >
              <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <button
                  type="button"
                  onClick={() => onSelect(record.id)}
                  className="grid min-w-0 gap-2 text-left focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-base font-semibold text-foreground">
                      {record.trader.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={active ? "success" : "outline"}>
                        {record.symbol} · {record.recordType}
                      </Badge>
                      {record.timeframe ? (
                        <Badge variant="outline">{record.timeframe}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {getRecordPreview(record)}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{formatRecordTimeRange(record)}</span>
                    <span>{record.executionPlans.length} 个方案</span>
                  </div>
                </button>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <RecordEditorDialog
                    record={record}
                    traders={traders}
                    onCreateTrader={onCreateTrader}
                    onCreateRecord={onCreateRecord}
                    onUpdateRecord={onUpdateRecord}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={async (event) => {
                      event.stopPropagation();

                      if (!window.confirm("存档后这条记录将不再出现在工作台里，继续吗？")) {
                        return;
                      }

                      await onArchiveRecord(record.id);
                    }}
                  >
                    <Archive className="h-4 w-4" />
                    存档
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
