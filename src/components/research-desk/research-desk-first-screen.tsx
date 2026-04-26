"use client";

import { useEffect, useState } from "react";
import { PriceChart } from "@/components/analysis/price-chart";
import { OutcomeDetail } from "@/components/research-desk/outcome-detail";
import { OutcomeSummaryPanel } from "@/components/research-desk/outcome-summary-panel";
import { RecordDetail } from "@/components/research-desk/record-detail";
import { ResearchChart } from "@/components/research-desk/research-chart";
import { ResearchChartToolbar } from "@/components/research-desk/research-chart-toolbar";
import type {
  ResearchDeskCandle,
  ResearchDeskOutcome,
  ResearchDeskOutcomeAggregates,
  ResearchDeskRecord,
  ResearchDeskResultFilter,
  ResearchDeskReviewTagFilter,
  ResearchDeskReviewTagOption,
  ResearchDeskSelection,
} from "@/components/research-desk/research-desk-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ResearchDeskFirstScreenProps = {
  selection: ResearchDeskSelection;
  resultFilter: ResearchDeskResultFilter;
  reviewTagFilter: ResearchDeskReviewTagFilter;
  reviewTagOptions: ResearchDeskReviewTagOption[];
  filteredOutcomes: ResearchDeskOutcome[];
  filteredSummary: ResearchDeskOutcomeAggregates;
  selectedOutcome: ResearchDeskOutcome | null;
  selectedRecord: ResearchDeskRecord | null;
  records: ResearchDeskRecord[];
  chartCandles: ResearchDeskCandle[];
  chartError: string | null;
  isChartLoading: boolean;
  onSelectionChange: (selection: ResearchDeskSelection) => void;
  onResultFilterChange: (resultFilter: ResearchDeskResultFilter) => void;
  onReviewTagFilterChange: (reviewTagFilter: ResearchDeskReviewTagFilter) => void;
  onSelectOutcome: (outcomeId: string) => void;
  onSaveReviewTags: (reviewTags: string[]) => Promise<void>;
  onSettlePlan: (input: {
    planId: string;
    entryPrice: number;
    exitPrice: number;
    settledAt: string;
    notes?: string;
  }) => Promise<void>;
};

type DetailPanelTab = "summary" | "outcome" | "record";

export function ResearchDeskFirstScreen({
  selection,
  resultFilter,
  reviewTagFilter,
  reviewTagOptions,
  filteredOutcomes,
  filteredSummary,
  selectedOutcome,
  selectedRecord,
  records,
  chartCandles,
  chartError,
  isChartLoading,
  onSelectionChange,
  onResultFilterChange,
  onReviewTagFilterChange,
  onSelectOutcome,
  onSaveReviewTags,
  onSettlePlan,
}: ResearchDeskFirstScreenProps) {
  const [mobilePanel, setMobilePanel] = useState<DetailPanelTab>(
    selectedOutcome ? "outcome" : selectedRecord ? "record" : "summary",
  );

  useEffect(() => {
    if (selectedOutcome) {
      setMobilePanel("outcome");
      return;
    }

    if (selectedRecord) {
      setMobilePanel("record");
    }
  }, [selectedOutcome, selectedRecord]);

  return (
    <div className="grid items-start gap-4 2xl:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,420px)]">
      <div className="grid gap-3.5 xl:gap-4">
        <ResearchChartToolbar
          selection={selection}
          onSelectionChange={onSelectionChange}
          resultFilter={resultFilter}
          onResultFilterChange={onResultFilterChange}
          reviewTagFilter={reviewTagFilter}
          reviewTagOptions={reviewTagOptions}
          onReviewTagFilterChange={onReviewTagFilterChange}
        />

        <Card className="overflow-hidden">
          <CardHeader className="gap-2">
            <div className="space-y-1">
              <p className="data-kicker">研究图</p>
              <CardTitle>本地结果轨道</CardTitle>
              <p className="support-copy text-sm">
                先锁定研究图上的 outcome，再决定是否进入结果详情和记录详情。
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-3">
            {chartError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {chartError}
              </div>
            ) : null}

            <ResearchChart
              candles={chartCandles}
              outcomes={filteredOutcomes}
              records={records}
              activeRecord={selectedRecord}
              selectedOutcomeId={selectedOutcome?.id ?? null}
              onSelectOutcome={onSelectOutcome}
              symbol={selection.symbol}
              timeframe={selection.timeframe}
            />
            {isChartLoading ? (
              <p className="text-sm text-muted-foreground">研究图切片加载中...</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="gap-2">
            <div className="space-y-1">
              <p className="data-kicker">次级参考位</p>
              <CardTitle>TradingView 参考视图</CardTitle>
              <p className="support-copy text-sm">
                保留原生行情细节，作为本地研究图旁的核对面板。桌面端并列阅读，移动端保持完整宽度避免压缩图表。
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <PriceChart
              symbol={selection.symbol}
              timeframe={selection.timeframe}
              title="TradingView 参考视图"
              description="保留原生行情细节，作为结果轨道旁的次级参考位。"
              height="clamp(260px, 42vw, 360px)"
            />
          </CardContent>
        </Card>
      </div>

      <aside className="grid gap-3.5 self-start xl:sticky xl:top-5">
        <div className="xl:hidden">
          <Tabs
            value={mobilePanel}
            onValueChange={(value) => setMobilePanel(value as DetailPanelTab)}
          >
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-[1.25rem] p-0.5">
              <TabsTrigger className="min-w-0" value="summary">
                总览
              </TabsTrigger>
              <TabsTrigger className="min-w-0" value="outcome">
                结果
              </TabsTrigger>
              <TabsTrigger className="min-w-0" value="record">
                记录
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <OutcomeSummaryPanel
                summary={filteredSummary}
                resultFilter={resultFilter}
                filteredCount={filteredOutcomes.length}
                reviewTagFilter={reviewTagFilter}
              />
            </TabsContent>
            <TabsContent value="outcome">
              <OutcomeDetail
                outcome={selectedOutcome}
                reviewTagOptions={reviewTagOptions}
                onSaveReviewTags={onSaveReviewTags}
              />
            </TabsContent>
            <TabsContent value="record">
              <RecordDetail record={selectedRecord} onSettlePlan={onSettlePlan} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden gap-3.5 xl:grid">
          <OutcomeSummaryPanel
            summary={filteredSummary}
            resultFilter={resultFilter}
            filteredCount={filteredOutcomes.length}
            reviewTagFilter={reviewTagFilter}
          />
          <OutcomeDetail
            outcome={selectedOutcome}
            reviewTagOptions={reviewTagOptions}
            onSaveReviewTags={onSaveReviewTags}
          />
          <RecordDetail record={selectedRecord} onSettlePlan={onSettlePlan} />
        </div>
      </aside>
    </div>
  );
}
