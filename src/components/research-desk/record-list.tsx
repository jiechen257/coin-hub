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
            <div
              key={record.id}
              className={cn(
                "grid gap-2 rounded-md border px-4 py-3 transition-colors",
                active
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/80 bg-secondary/30 hover:border-primary/25 hover:bg-accent/70",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(record.id)}
                  className="grid min-w-0 flex-1 gap-2 text-left focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
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
                    <span>{formatRecordTimeRange(record)}</span>
                    <span>{record.executionPlans.length} 个方案</span>
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  <RecordEditorDialog
                    record={record}
                    traders={traders}
                    onCreateTrader={onCreateTrader}
                    onCreateRecord={onCreateRecord}
                    onUpdateRecord={onUpdateRecord}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
