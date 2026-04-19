"use client";

import { PencilLine, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  RecordForm,
  type CreateRecordRequest,
  type UpdateRecordRequest,
} from "@/components/research-desk/record-form";
import type {
  ResearchDeskRecord,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RecordEditorDialogProps = {
  record: ResearchDeskRecord;
  traders: ResearchDeskTrader[];
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
  onUpdateRecord: (recordId: string, input: UpdateRecordRequest) => Promise<void>;
};

export function RecordEditorDialog({
  record,
  traders,
  onCreateTrader,
  onCreateRecord,
  onUpdateRecord,
}: RecordEditorDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => event.stopPropagation()}
        >
          <PencilLine className="h-4 w-4" />
          编辑
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] p-0">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Record Editor</span>
          </div>
          <DialogTitle>编辑记录</DialogTitle>
          <DialogDescription>
            直接更新这条记录的时间、原文和方案结构。已结算样本继续保留，不会在这里被移除。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(92vh-116px)] overflow-y-auto px-6 py-5">
          {open ? (
            <RecordForm
              traders={traders}
              initialRecord={record}
              onCreateTrader={onCreateTrader}
              onCreateRecord={onCreateRecord}
              onUpdateRecord={(input) => onUpdateRecord(record.id, input)}
              onCancel={() => setOpen(false)}
              onRecordSaved={() => setOpen(false)}
              variant="dialog"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
