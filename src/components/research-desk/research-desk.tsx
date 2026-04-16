"use client";

import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { PriceChart } from "@/components/analysis/price-chart";
import {
  type ResearchDeskPayload,
  type ResearchDeskRecord,
  type ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import {
  type CreateRecordRequest,
} from "@/components/research-desk/record-form";
import { RecordComposerDialog } from "@/components/research-desk/record-composer-dialog";
import { RecordList } from "@/components/research-desk/record-list";
import { RecordDetail } from "@/components/research-desk/record-detail";
import { StrategyCandidateList } from "@/components/research-desk/strategy-candidate-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ResearchDeskProps = {
  initialData: ResearchDeskPayload;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `请求失败（${response.status}）`);
  }

  return (await response.json()) as T;
}

export function ResearchDesk({ initialData }: ResearchDeskProps) {
  const [traders, setTraders] = useState(initialData.traders);
  const [records, setRecords] = useState(initialData.records);
  const [selectedRecordId, setSelectedRecordId] = useState(
    initialData.selectedRecordId,
  );
  const [candidates, setCandidates] = useState(initialData.candidates);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [isRegeneratingCandidates, setIsRegeneratingCandidates] = useState(false);
  const [showEthChart, setShowEthChart] = useState(true);

  const selectedRecord = useMemo(
    () =>
      records.find((record) => record.id === selectedRecordId) ??
      records[0] ??
      null,
    [records, selectedRecordId],
  );

  async function refreshRecords() {
    const payload = await parseResponse<{ records: ResearchDeskRecord[] }>(
      await fetch("/api/trader-records", { cache: "no-store" }),
    );
    setRecords(payload.records);
    setSelectedRecordId((current) => current ?? payload.records[0]?.id ?? null);
  }

  async function handleCreateTrader(input: {
    name: string;
    platform?: string;
    notes?: string;
  }): Promise<ResearchDeskTrader> {
    const payload = await parseResponse<{ trader: ResearchDeskTrader }>(
      await fetch("/api/traders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );

    setTraders((current) =>
      [...current, payload.trader].sort((left, right) =>
        left.name.localeCompare(right.name, "zh-CN"),
      ),
    );

    return payload.trader;
  }

  async function handleCreateRecord(input: CreateRecordRequest) {
    const payload = await parseResponse<{ record: ResearchDeskRecord }>(
      await fetch("/api/trader-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );

    setRecords((current) => [payload.record, ...current]);
    setSelectedRecordId(payload.record.id);
  }

  async function handleSettlePlan(input: {
    planId: string;
    entryPrice: number;
    exitPrice: number;
    settledAt: string;
    notes?: string;
  }) {
    const { planId, ...payload } = input;

    await parseResponse<{ sample: { id: string } }>(
      await fetch(`/api/execution-plans/${planId}/settle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    await refreshRecords();
  }

  async function handleRegenerateCandidates() {
    setCandidateMessage(null);
    setCandidateError(null);
    setIsRegeneratingCandidates(true);

    try {
      const payload = await parseResponse<{
        regenerated: number;
        candidates: typeof initialData.candidates;
      }>(
        await fetch("/api/strategy-candidates", {
          method: "POST",
        }),
      );

      setCandidates(payload.candidates);
      setCandidateMessage(`已归纳 ${payload.regenerated} 条候选策略`);
    } catch (error) {
      setCandidateError(
        error instanceof Error ? error.message : "归纳候选策略失败",
      );
    } finally {
      setIsRegeneratingCandidates(false);
    }
  }

  return (
    <section className="grid gap-6">
      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit uppercase tracking-[0.28em]">
              Coin Hub
            </Badge>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                交易员策略研究台
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                在一个工作台里管理交易员记录、观察 BTC / ETH K 线、结算样本并归纳候选策略。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>交互组件已切到 shadcn 语义层，主题色支持变量插槽覆盖。</span>
            </div>
          </div>

          <div className="max-w-[320px] rounded-md border border-border/80 bg-secondary/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              图表交互
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              左侧双图观察，右侧集中录入与查看
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              默认打开 Binance BTCUSDT 永续合约和 ETHUSDT 永续合约，ETH 图支持收起，手机上按纵向顺序浏览。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  双图工作区
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  BTC 主图常驻上方，ETH 辅图常驻下方；两张图都能各自切换周期。
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEthChart((current) => !current)}
                aria-expanded={showEthChart}
              >
                {showEthChart ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showEthChart ? "收起 ETH 图" : "展开 ETH 图"}
              </Button>
            </CardContent>
          </Card>

          <PriceChart
            symbol={initialData.selection.symbol}
            timeframe={initialData.selection.timeframe}
            title="BTC 主图"
            description="默认 1h 永续合约视图，图内支持继续切周期与品种"
            height="clamp(320px, 68vw, 500px)"
          />

          {showEthChart ? (
            <PriceChart
              symbol="ETH"
              timeframe="1h"
              title="ETH 辅图"
              description="默认 1h 永续合约视图，适合与 BTC 同屏对照"
              height="clamp(260px, 52vw, 380px)"
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm font-medium text-foreground">ETH 辅图已收起</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    需要对照时展开，手机上浏览会更轻。
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEthChart(true)}
                >
                  <Eye className="h-4 w-4" />
                  展开
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6">
          <Card>
            <CardContent className="grid gap-5 p-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  工作台操作
                </p>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    右侧录入与浏览
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    录入动作、记录列表、详情和候选策略都收进这一列，手机上会排成连续区块。
                  </p>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-3">
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
                  onCreateTrader={handleCreateTrader}
                  onCreateRecord={handleCreateRecord}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  新建后会自动选中刚创建的记录，详情区立即跟进。
                </p>
              </div>
            </CardContent>
          </Card>

          <RecordList
            records={records}
            selectedRecordId={selectedRecord?.id ?? null}
            onSelect={setSelectedRecordId}
          />

          <RecordDetail record={selectedRecord} onSettlePlan={handleSettlePlan} />
          <StrategyCandidateList
            candidates={candidates}
            onRegenerate={handleRegenerateCandidates}
            isLoading={isRegeneratingCandidates}
            message={candidateMessage}
            error={candidateError}
          />
        </div>
      </div>
    </section>
  );
}
