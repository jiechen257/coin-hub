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
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,430px)]">
      <div className="grid gap-4">
        <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(239,246,255,0.72)_52%,rgba(255,247,237,0.82))]">
          <CardContent className="grid gap-4 p-4">
            <div className="space-y-1.5">
              <p className="data-kicker">次级工作区</p>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  新建记录与最近记录
                </h2>
                <p className="support-copy text-sm">
                  这里承接录入、切换、结算和策略沉淀。移动端强调单列可点区域，桌面端保持摘要与列表并排。
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-border/70 bg-white/72 p-3.5">
                <p className="data-kicker">
                  交易员
                </p>
                <p className="mt-2 text-[1.65rem] font-semibold tracking-tight text-foreground">
                  {traders.length}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/72 p-3.5">
                <p className="data-kicker">
                  记录
                </p>
                <p className="mt-2 text-[1.65rem] font-semibold tracking-tight text-foreground">
                  {records.length}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-white/72 p-3.5">
                <p className="data-kicker">
                  候选策略
                </p>
                <p className="mt-2 text-[1.65rem] font-semibold tracking-tight text-foreground">
                  {candidates.length}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <RecordComposerDialog
                traders={traders}
                onCreateTrader={onCreateTrader}
                onCreateRecord={onCreateRecord}
              />
              <p className="text-sm leading-6 text-muted-foreground">
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
