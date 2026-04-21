"use client";

import type { CSSProperties } from "react";
import {
  getRecordEndedAt,
  getRecordStartedAt,
} from "@/components/research-desk/record-time-range";
import type {
  ResearchDeskOutcome,
  ResearchDeskRecord,
} from "@/components/research-desk/research-desk-types";

type ResearchChartTimePopoverProps = {
  outcome: ResearchDeskOutcome;
  record: ResearchDeskRecord | null;
  title: string;
  align: "start" | "end";
  style: CSSProperties;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatDuration(startAt: string, endAt: string) {
  const durationMs = Math.max(
    new Date(endAt).getTime() - new Date(startAt).getTime(),
    0,
  );
  const totalMinutes = Math.round(durationMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const segments: string[] = [];

  if (days > 0) {
    segments.push(`${days}天`);
  }

  if (hours > 0) {
    segments.push(`${hours}小时`);
  }

  if (minutes > 0 || segments.length === 0) {
    segments.push(`${minutes}分钟`);
  }

  return segments.join(" ");
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium leading-5 text-foreground">{value}</p>
    </div>
  );
}

export function ResearchChartTimePopover({
  outcome,
  record,
  title,
  align,
  style,
}: ResearchChartTimePopoverProps) {
  return (
    <div
      className="research-outcome-time-popover"
      data-align={align}
      data-slot="research-chart-time-popover"
      style={style}
      role="note"
    >
      <div className="grid gap-3">
        <div className="grid gap-1">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            时间信息
          </p>
          <p className="text-sm font-semibold leading-5 text-foreground">
            {title}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {record ? (
            <>
              <DetailLine label="记录开始" value={formatDateTime(getRecordStartedAt(record))} />
              <DetailLine label="记录结束" value={formatDateTime(getRecordEndedAt(record))} />
            </>
          ) : null}
          <DetailLine label="观察开始" value={formatDateTime(outcome.windowStartAt)} />
          <DetailLine label="观察结束" value={formatDateTime(outcome.windowEndAt)} />
          <DetailLine
            label="持续时长"
            value={formatDuration(outcome.windowStartAt, outcome.windowEndAt)}
          />
          <DetailLine label="周期" value={outcome.timeframe} />
        </div>
      </div>
    </div>
  );
}
