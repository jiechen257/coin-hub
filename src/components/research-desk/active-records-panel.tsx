"use client";

import type { ReactNode } from "react";
import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";
import { RECORD_STATUS_LABELS } from "@/modules/records/record-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActiveRecordsPanelProps = {
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  onSelectRecord: (recordId: string) => void;
  children: ReactNode;
};

function getFeaturedRecords(records: ResearchDeskRecord[]) {
  const running = records.filter((record) => record.status === "in_progress");

  if (running.length > 0) {
    return {
      title: "正在运行的记录",
      description: "首页首屏优先展示进行中记录。没有进行中记录时，展示可继续推进的记录。",
      emptyText: "暂无运行中记录，先新建或开始一条记录。",
      records: running,
    };
  }

  const notStarted = records
    .filter((record) => (record.status ?? "not_started") === "not_started")
    .slice(0, 6);

  if (notStarted.length > 0) {
    return {
      title: "待启动记录",
      description: "当前没有进行中记录，首屏展示尚未开始记录，便于直接启动或补齐。",
      emptyText: "暂无待启动记录，先新建一条记录。",
      records: notStarted,
    };
  }

  const ended = records
    .filter((record) => record.status === "ended")
    .slice(0, 6);

  return {
    title: "最近已结束记录",
    description: "当前没有进行中记录，首屏展示最近已结束记录，便于确认存量记录仍在并继续补齐。",
    emptyText: "暂无可展示记录，先新建一条记录。",
    records: ended,
  };
}

export function ActiveRecordsPanel({
  records,
  selectedRecordId,
  onSelectRecord,
  children,
}: ActiveRecordsPanelProps) {
  const featured = getFeaturedRecords(records);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="space-y-2">
          <p className="data-kicker">运行中</p>
          <CardTitle>{featured.title}</CardTitle>
          <p className="support-copy text-sm">
            {featured.description}
          </p>
        </CardHeader>
        <CardContent>
          {featured.records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
              {featured.emptyText}
            </div>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
              {featured.records.map((record) => {
                const active = record.id === selectedRecordId;
                const status = record.status ?? "not_started";

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => onSelectRecord(record.id)}
                    className={cn(
                      "grid gap-2 rounded-xl border p-3 text-left transition-[border-color,box-shadow,background-color]",
                      active
                        ? "border-primary/30 bg-primary/10 shadow-[0_16px_32px_-28px_rgba(14,165,233,0.8)]"
                        : "border-border/80 bg-secondary/20 hover:border-primary/25 hover:bg-accent/45",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={active ? "success" : "outline"}>
                        {RECORD_STATUS_LABELS[status]}
                      </Badge>
                      <Badge variant="outline">{record.symbol}</Badge>
                    </div>
                    <p className="font-medium text-foreground">{record.trader.name}</p>
                    <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                      {record.rawContent}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
