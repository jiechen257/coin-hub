"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { RecordForm, type CreateRecordRequest } from "@/components/research-desk/record-form";
import type { ResearchDeskTrader } from "@/components/research-desk/research-desk-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RecordComposerDialogProps = {
  traders: ResearchDeskTrader[];
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
};

export function RecordComposerDialog({
  traders,
  onCreateTrader,
  onCreateRecord,
}: RecordComposerDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-4 w-4" />
          新建记录
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] p-0">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Record Composer</span>
          </div>
          <DialogTitle>新建交易记录</DialogTitle>
          <DialogDescription>
            主页面保持轻量浏览，新建动作收进弹窗里完成。先选人物，再补充真实开单或行情观点。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(92vh-116px)] overflow-y-auto px-6 py-5">
          {open ? (
            <RecordForm
              traders={traders}
              onCreateTrader={onCreateTrader}
              onCreateRecord={onCreateRecord}
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
