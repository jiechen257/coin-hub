"use client";

import { Search } from "lucide-react";
import { ArchiveSummaryEditor } from "@/components/research-desk/archive-summary-editor";
import { OutcomeSummaryPanel } from "@/components/research-desk/outcome-summary-panel";
import { PriceChart } from "@/components/analysis/price-chart";
import type {
  ResearchDeskArchivePayload,
  ResearchDeskRecord,
} from "@/components/research-desk/research-desk-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ArchiveAnalysisPanelProps = {
  payload: ResearchDeskArchivePayload | null;
  selectedRecord: ResearchDeskRecord | null;
  isLoading: boolean;
  error: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onSelectRecord: (recordId: string) => void;
  onSaveArchiveSummary: (recordId: string, archiveSummary: string) => Promise<void>;
};

function formatRate(value: number | null) {
  return value === null ? "--" : `${Math.round(value * 100)}%`;
}

export function ArchiveAnalysisPanel({
  payload,
  selectedRecord,
  isLoading,
  error,
  query,
  onQueryChange,
  onRefresh,
  onSelectRecord,
  onSaveArchiveSummary,
}: ArchiveAnalysisPanelProps) {
  const records = payload?.records ?? [];
  const stats = payload?.archiveStats;
  const selection = payload?.selection ?? { symbol: "BTC" as const, timeframe: "1h" as const };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="space-y-2">
          <p className="data-kicker">归档分析</p>
          <CardTitle>已归档记录</CardTitle>
          <p className="support-copy text-sm">
            归档页聚合已完成记录，左侧选中记录后，TradingView 参考视图与总结区同步切换。
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="搜索交易员、原文、备注、归档总结"
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" onClick={onRefresh}>
              搜索
            </Button>
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">归档分析加载中...</p>
          ) : null}

          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {records.map((record) => {
              const active = record.id === selectedRecord?.id;

              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => onSelectRecord(record.id)}
                  className={cn(
                    "grid gap-2 rounded-xl border p-3 text-left",
                    active
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/80 bg-secondary/20 hover:border-primary/25",
                  )}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{record.symbol}</Badge>
                    <Badge variant="success">已归档</Badge>
                  </div>
                  <p className="font-medium">{record.trader.name}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {record.rawContent}
                  </p>
                </button>
              );
            })}
          </div>

          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-sm text-muted-foreground">
              还没有归档记录。先把已结束记录归档，再回到这里做分析。
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="data-kicker">归档数</p>
            <p className="mt-2 text-2xl font-semibold">{stats?.recordCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="data-kicker">good 占比</p>
            <p className="mt-2 text-2xl font-semibold">{formatRate(stats?.goodRate ?? null)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="data-kicker">已总结</p>
            <p className="mt-2 text-2xl font-semibold">{stats?.summarizedCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="data-kicker">待总结</p>
            <p className="mt-2 text-2xl font-semibold">{stats?.unsummarizedCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <PriceChart
        symbol={selection.symbol}
        timeframe={selection.timeframe}
        title="归档 TradingView 参考视图"
        description="按当前归档记录切换标的和周期，用于复盘核对。"
        height="clamp(300px, 44vw, 430px)"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        {selectedRecord ? (
          <ArchiveSummaryEditor
            value={selectedRecord.archiveSummary}
            onSave={(value) => onSaveArchiveSummary(selectedRecord.id, value)}
          />
        ) : null}
        <OutcomeSummaryPanel
          summary={
            payload?.summary ?? {
              counts: {
                good: 0,
                neutral: 0,
                bad: 0,
                pending: 0,
                total: 0,
              },
              reviewTags: [],
            }
          }
          resultFilter="all"
          filteredCount={payload?.chart.outcomes.length ?? 0}
          reviewTagFilter={null}
        />
      </div>
    </div>
  );
}
