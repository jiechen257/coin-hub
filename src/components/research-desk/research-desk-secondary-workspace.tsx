"use client";

import { RecordComposerDialog } from "@/components/research-desk/record-composer-dialog";
import { RecordList } from "@/components/research-desk/record-list";
import { StrategyCandidateList } from "@/components/research-desk/strategy-candidate-list";
import type {
  ResearchDeskCandidate,
  ResearchDeskRecord,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import type {
  CreateRecordRequest,
  UpdateRecordRequest,
} from "@/components/research-desk/record-form";
import { Card, CardContent } from "@/components/ui/card";

type ResearchDeskSecondaryWorkspaceProps = {
  traders: ResearchDeskTrader[];
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  candidates: ResearchDeskCandidate[];
  candidateMessage: string | null;
  candidateError: string | null;
  isRegeneratingCandidates: boolean;
  onCreateTrader: (input: {
    name: string;
    platform?: string;
    notes?: string;
  }) => Promise<ResearchDeskTrader>;
  onCreateRecord: (input: CreateRecordRequest) => Promise<void>;
  onUpdateRecord: (recordId: string, input: UpdateRecordRequest) => Promise<void>;
  onArchiveRecord: (recordId: string) => Promise<void>;
  onSelectRecord: (recordId: string) => void;
  onRegenerateCandidates: () => Promise<void>;
};

export function ResearchDeskSecondaryWorkspace({
  traders,
  records,
  selectedRecordId,
  candidates,
  candidateMessage,
  candidateError,
  isRegeneratingCandidates,
  onCreateTrader,
  onCreateRecord,
  onUpdateRecord,
  onArchiveRecord,
  onSelectRecord,
  onRegenerateCandidates,
}: ResearchDeskSecondaryWorkspaceProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="grid gap-6">
        <Card>
          <CardContent className="grid gap-5 p-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                次级工作区
              </p>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  新建记录与最近记录
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  新建记录、切换最近样本、继续结算方案的入口都留在这里。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border/80 bg-secondary/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  交易员
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {traders.length}
                </p>
              </div>
              <div className="rounded-md border border-border/80 bg-secondary/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  记录
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {records.length}
                </p>
              </div>
              <div className="rounded-md border border-border/80 bg-secondary/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  候选策略
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {candidates.length}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <RecordComposerDialog
                traders={traders}
                onCreateTrader={onCreateTrader}
                onCreateRecord={onCreateRecord}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                新建后会自动切到该记录，首屏详情区同步更新。
              </p>
            </div>
          </CardContent>
        </Card>

        <RecordList
          traders={traders}
          records={records}
          selectedRecordId={selectedRecordId}
          onSelect={onSelectRecord}
          onCreateTrader={onCreateTrader}
          onCreateRecord={onCreateRecord}
          onUpdateRecord={onUpdateRecord}
          onArchiveRecord={onArchiveRecord}
        />
      </div>

      <StrategyCandidateList
        candidates={candidates}
        onRegenerate={onRegenerateCandidates}
        isLoading={isRegeneratingCandidates}
        message={candidateMessage}
        error={candidateError}
      />
    </div>
  );
}
