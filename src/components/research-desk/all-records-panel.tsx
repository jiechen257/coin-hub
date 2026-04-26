"use client";

import { useState } from "react";
import { RecordList } from "@/components/research-desk/record-list";
import type {
  ResearchDeskRecord,
  ResearchDeskRecordStatus,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import type {
  CreateRecordRequest,
  UpdateRecordRequest,
} from "@/components/research-desk/record-form";
import { RECORD_STATUS_LABELS } from "@/modules/records/record-status";
import { Button } from "@/components/ui/button";

type AllRecordsPanelProps = {
  traders: ResearchDeskTrader[];
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  onSelectRecord: (recordId: string) => void;
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
  onUpdateRecord: (recordId: string, input: UpdateRecordRequest) => Promise<void>;
};

const FILTERS: Array<ResearchDeskRecordStatus | "all"> = [
  "all",
  "in_progress",
  "not_started",
  "ended",
];

export function AllRecordsPanel({
  traders,
  records,
  selectedRecordId,
  onSelectRecord,
  onCreateTrader,
  onCreateRecord,
  onUpdateRecord,
}: AllRecordsPanelProps) {
  const [filter, setFilter] = useState<ResearchDeskRecordStatus | "all">("all");
  const filteredRecords =
    filter === "all"
      ? records
      : records.filter((record) => (record.status ?? "not_started") === filter);

  return (
    <div className="grid gap-3">
      <div className="chip-scroll">
        {FILTERS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={filter === item ? "default" : "outline"}
            onClick={() => setFilter(item)}
          >
            {item === "all" ? "全部记录" : RECORD_STATUS_LABELS[item]}
          </Button>
        ))}
      </div>

      <RecordList
        traders={traders}
        records={filteredRecords}
        selectedRecordId={selectedRecordId}
        onSelect={onSelectRecord}
        onCreateTrader={onCreateTrader}
        onCreateRecord={onCreateRecord}
        onUpdateRecord={onUpdateRecord}
      />
    </div>
  );
}
