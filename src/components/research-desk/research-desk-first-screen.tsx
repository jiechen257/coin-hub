"use client";

import { Sparkles } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

function buildHeroStats(
  selection: ResearchDeskSelection,
  filteredSummary: ResearchDeskOutcomeAggregates,
  filteredCount: number,
) {
  return [
    {
      label: "当前切片",
      value: `${selection.symbol} · ${selection.timeframe}`,
      meta: "研究图与参考图同步切换",
    },
    {
      label: "过滤结果",
      value: `${filteredCount}`,
      meta: `good ${filteredSummary.counts.good} · bad ${filteredSummary.counts.bad}`,
    },
    {
      label: "待跟进",
      value: `${filteredSummary.counts.pending}`,
      meta: "优先继续标注或结算样本",
    },
  ];
}

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
  const heroStats = buildHeroStats(
    selection,
    filteredSummary,
    filteredOutcomes.length,
  );
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
        <Card className="overflow-hidden border-primary/15 bg-[radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.16),transparent_18rem),radial-gradient(circle_at_92%_82%,rgba(245,158,11,0.1),transparent_14rem),linear-gradient(135deg,rgba(255,255,255,0.95),rgba(239,246,255,0.84)_48%,rgba(255,247,237,0.9))]">
          <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)]">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="w-fit border-primary/20 bg-primary/8 uppercase tracking-[0.28em] text-primary"
              >
                Coin Hub
              </Badge>
              <div className="space-y-1.5">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  记录 K 线图工作台
                </h1>
                <p className="support-copy max-w-3xl">
                  首屏先完成结果复盘，再进入记录录入和策略沉淀。移动端强调单列阅读与分组切换，桌面端保留研究图和详情并排的高密度工作流。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>优先看本地研究图，次级参考位继续承接原生行情核对。</span>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.25rem] border border-white/70 bg-white/72 p-3.5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur"
                >
                  <p className="data-kicker">{stat.label}</p>
                  <p className="mt-2 text-[1.65rem] font-semibold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                    {stat.meta}
                  </p>
                </div>
              ))}
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
