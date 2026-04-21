"use client";

import { Sparkles } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_400px]">
      <div className="grid gap-4">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-4 p-6">
            <Badge variant="outline" className="w-fit uppercase tracking-[0.28em]">
              Coin Hub
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                记录 K 线图工作台
              </h1>
              <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                先看本地研究图和结果轨道，再用 TradingView 做次级行情核对；记录录入、样本结算、最近记录和候选策略继续保留在同一张桌面里。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>首屏优先服务记录复盘，次级区域继续承接录入与策略归纳。</span>
            </div>
          </CardContent>
        </Card>

        <ResearchChartToolbar
          selection={selection}
          onSelectionChange={onSelectionChange}
          resultFilter={resultFilter}
          onResultFilterChange={onResultFilterChange}
          reviewTagFilter={reviewTagFilter}
          reviewTagOptions={reviewTagOptions}
          onReviewTagFilterChange={onReviewTagFilterChange}
        />

        {chartError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {chartError}
          </div>
        ) : null}

        <div className="grid gap-4">
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
        </div>

        <PriceChart
          symbol={selection.symbol}
          timeframe={selection.timeframe}
          title="TradingView 参考视图"
          description="保留原生行情细节，作为结果轨道旁的次级参考位。"
          height="clamp(260px, 42vw, 360px)"
        />
      </div>

      <div className="grid gap-4">
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
    </div>
  );
}
