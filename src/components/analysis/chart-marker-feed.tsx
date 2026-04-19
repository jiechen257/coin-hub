"use client";

import { useMemo, useState } from "react";
import { Clock3, ListTree } from "lucide-react";
import type { ResearchDeskMarker } from "@/components/research-desk/research-desk-types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ChartMarkerFeedProps = {
  markers: ResearchDeskMarker[];
  colors: {
    bull: string;
    bear: string;
    neutral: string;
  };
};

function formatMarkerTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getToneColor(
  tone: ResearchDeskMarker["tone"],
  colors: ChartMarkerFeedProps["colors"],
) {
  if (tone === "bullish") {
    return colors.bull;
  }

  if (tone === "bearish") {
    return colors.bear;
  }

  return colors.neutral;
}

export function ChartMarkerFeed({ markers, colors }: ChartMarkerFeedProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleMarkers = useMemo(
    () => (isExpanded ? markers : markers.slice(0, 2)),
    [isExpanded, markers],
  );

  if (markers.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-border/80 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        还没有交易员标记，记录观点后会显示在图上。
      </div>
    );
  }

  return (
    <section className="mt-4 rounded-lg border border-border/80 bg-secondary/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ListTree className="h-4 w-4 text-primary" />
            <span>图上记录</span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            先看摘要，再按需展开完整观点。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{markers.length} 条</Badge>
          {markers.length > 2 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? "收起列表" : `查看全部 ${markers.length} 条`}
            </Button>
          ) : null}
        </div>
      </div>

      <Accordion type="single" collapsible className="mt-3">
        {visibleMarkers.map((marker) => (
          <AccordionItem
            key={`${marker.time}-${marker.label}-${marker.text}-feed`}
            value={`${marker.time}-${marker.label}-${marker.text}`}
            className="rounded-md border border-border/80 bg-card/80 px-3"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="grid min-w-0 flex-1 gap-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getToneColor(marker.tone, colors) }}
                  />
                  <Badge variant="outline">{marker.label}</Badge>
                  <span className="min-w-0 flex-1 line-clamp-1 text-sm font-medium text-foreground">
                    {marker.previewText ?? marker.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{formatMarkerTime(marker.time)}</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {marker.detailText ?? marker.text}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {!isExpanded && markers.length > 2 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          还有 {markers.length - 2} 条记录已折叠。
        </p>
      ) : null}
    </section>
  );
}
