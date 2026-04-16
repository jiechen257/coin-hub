"use client";

import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

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

export function RecordList({
  records,
  selectedRecordId,
  onSelect,
}: RecordListProps) {
  return (
    <section className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">最近记录</h2>
        <span className="text-xs text-slate-400">{records.length} 条</span>
      </div>

      <div className="space-y-2">
        {records.map((record) => {
          const active = record.id === selectedRecordId;

          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
              className={[
                "grid w-full gap-1 rounded-md border px-3 py-3 text-left transition",
                active
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-slate-950/50 hover:border-white/20",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">
                  {record.trader.name}
                </span>
                <span className="text-xs uppercase text-slate-400">
                  {record.symbol} · {record.recordType}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-slate-300">{record.rawContent}</p>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>{formatOccurredAt(record.occurredAt)}</span>
                <span>{record.executionPlans.length} 个方案</span>
              </div>
            </button>
          );
        })}

        {records.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 px-3 py-6 text-sm text-slate-400">
            还没有交易员记录。
          </p>
        ) : null}
      </div>
    </section>
  );
}
