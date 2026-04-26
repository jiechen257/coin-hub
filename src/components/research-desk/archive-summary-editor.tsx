"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ArchiveSummaryEditorProps = {
  value: string | null;
  onSave: (value: string) => Promise<void>;
};

export function ArchiveSummaryEditor({
  value,
  onSave,
}: ArchiveSummaryEditorProps) {
  const [draft, setDraft] = useState(value ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  return (
    <div className="grid gap-2 rounded-xl border border-border/70 bg-card/80 p-3.5">
      <Label htmlFor="archive-summary">归档总结</Label>
      <Textarea
        id="archive-summary"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-28"
        placeholder="记录这条归档记录的做对、做错、可复用信号。"
      />
      <Button
        type="button"
        className="justify-self-start"
        disabled={isSaving}
        onClick={async () => {
          setIsSaving(true);
          try {
            await onSave(draft);
          } finally {
            setIsSaving(false);
          }
        }}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        保存总结
      </Button>
    </div>
  );
}
