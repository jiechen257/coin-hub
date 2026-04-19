"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Clock3, Layers3, TextQuote } from "lucide-react";
import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractRecordInsights } from "./record-detail-utils";

type RecordDetailInsightsProps = {
  record: ResearchDeskRecord;
};

function InsightGroup({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3 rounded-lg border border-border/80 bg-secondary/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline">
            {item}
          </Badge>
        ))}
      </div>
    </section>
  );
}

export function RecordDetailInsights({ record }: RecordDetailInsightsProps) {
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const insights = useMemo(() => extractRecordInsights(record), [record]);

  return (
    <div className="grid gap-4">
      {insights.summary ? (
        <Alert>
          <AlertTitle>核心判断</AlertTitle>
          <AlertDescription>{insights.summary}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <InsightGroup
          title="关键价位"
          icon={<Layers3 className="h-4 w-4 text-primary" />}
          items={insights.keyLevels}
        />
        <InsightGroup
          title="时间节点"
          icon={<Clock3 className="h-4 w-4 text-primary" />}
          items={insights.timeNodes}
        />
      </div>

      <section className="grid gap-3 rounded-lg border border-border/80 bg-secondary/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TextQuote className="h-4 w-4 text-primary" />
            <span>原始观点</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsRawExpanded((current) => !current)}
          >
            {isRawExpanded ? "收起原文" : "展开原文"}
          </Button>
        </div>

        <p
          className={cn(
            "text-sm leading-7 text-muted-foreground",
            isRawExpanded ? "whitespace-pre-wrap" : "line-clamp-5",
          )}
        >
          {isRawExpanded ? record.rawContent : insights.previewText}
        </p>
      </section>
    </div>
  );
}
