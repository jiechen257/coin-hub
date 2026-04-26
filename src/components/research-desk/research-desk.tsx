"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActiveRecordsPanel } from "@/components/research-desk/active-records-panel";
import { AllRecordsPanel } from "@/components/research-desk/all-records-panel";
import { ArchiveAnalysisPanel } from "@/components/research-desk/archive-analysis-panel";
import { ResearchDeskFirstScreen } from "@/components/research-desk/research-desk-first-screen";
import {
  ResearchDeskMainTabs,
  type ResearchDeskWorkspaceTab,
} from "@/components/research-desk/research-desk-main-tabs";
import { ResearchDeskSidebar } from "@/components/research-desk/research-desk-sidebar";
import { ResearchDeskWorkspaceShell } from "@/components/research-desk/research-desk-workspace-shell";
import {
  buildOutcomeAggregates,
  findRecordForOutcome,
  filterOutcomes,
  findOutcomeForRecord,
  hasReviewTagOption,
  resolveOutcomeId,
} from "@/components/research-desk/research-desk-filtering";
import { StrategyCandidateList } from "@/components/research-desk/strategy-candidate-list";
import type {
  ResearchDeskArchivePayload,
  ResearchDeskChartSlicePayload,
  ResearchDeskPayload,
  ResearchDeskRecord,
  ResearchDeskRecordStatus,
  ResearchDeskResultFilter,
  ResearchDeskReviewTagFilter,
  ResearchDeskSelection,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import type {
  CreateRecordRequest,
  UpdateRecordRequest,
} from "@/components/research-desk/record-form";

type ResearchDeskProps = {
  initialData: ResearchDeskPayload;
};

type ResearchDeskChartState = Pick<
  ResearchDeskChartSlicePayload,
  "reviewTagOptions" | "summary" | "chart"
>;

type DetailMode = "record" | "outcome";

type ChartRefreshOptions = {
  preferredOutcomeId?: string | null;
  preferredRecordId?: string | null;
  allowFallbackOutcome?: boolean;
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

function buildChartRequestUrl(selection: ResearchDeskSelection) {
  const query = new URLSearchParams(selection);
  return `/api/research-desk/chart?${query.toString()}`;
}

function buildArchiveRequestUrl(input: {
  selection: ResearchDeskSelection;
  recordId?: string | null;
  q?: string;
}) {
  const query = new URLSearchParams(input.selection);

  if (input.recordId) {
    query.set("recordId", input.recordId);
  }

  if (input.q?.trim()) {
    query.set("q", input.q.trim());
  }

  return `/api/research-desk/archive?${query.toString()}`;
}

function isSameSelection(
  left: ResearchDeskSelection,
  right: ResearchDeskSelection,
) {
  return left.symbol === right.symbol && left.timeframe === right.timeframe;
}

export function ResearchDesk({ initialData }: ResearchDeskProps) {
  const databaseRuntime = initialData.databaseRuntime ?? {
    target: "local" as const,
    label: "本地 SQLite",
    tone: "neutral" as const,
  };
  const [traders, setTraders] = useState(initialData.traders);
  const [records, setRecords] = useState(initialData.records);
  const [selectedRecordId, setSelectedRecordId] = useState(
    initialData.selectedRecordId,
  );
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(
    initialData.selectedOutcomeId,
  );
  const [detailMode, setDetailMode] = useState<DetailMode>(
    initialData.selectedOutcomeId ? "outcome" : "record",
  );
  const [candidates, setCandidates] = useState(initialData.candidates);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [isRegeneratingCandidates, setIsRegeneratingCandidates] = useState(false);
  const [selection, setSelection] = useState(initialData.selection);
  const [chartState, setChartState] = useState<ResearchDeskChartState>({
    reviewTagOptions: initialData.reviewTagOptions,
    summary: initialData.summary,
    chart: initialData.chart,
  });
  const [resultFilter, setResultFilter] =
    useState<ResearchDeskResultFilter>("all");
  const [reviewTagFilter, setReviewTagFilter] =
    useState<ResearchDeskReviewTagFilter>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] =
    useState<ResearchDeskWorkspaceTab>("active");
  const [archivePayload, setArchivePayload] =
    useState<ResearchDeskArchivePayload | null>(null);
  const [selectedArchiveRecordId, setSelectedArchiveRecordId] =
    useState<string | null>(null);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [isArchiveLoading, setIsArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const chartRequestIdRef = useRef(0);

  const filteredOutcomes = useMemo(
    () =>
      filterOutcomes(chartState.chart.outcomes, {
        resultFilter,
        reviewTagFilter,
      }),
    [chartState.chart.outcomes, resultFilter, reviewTagFilter],
  );
  const filteredSummary = useMemo(
    () => buildOutcomeAggregates(filteredOutcomes),
    [filteredOutcomes],
  );
  const selectedOutcome = useMemo(
    () =>
      chartState.chart.outcomes.find((outcome) => outcome.id === selectedOutcomeId) ??
      null,
    [chartState.chart.outcomes, selectedOutcomeId],
  );
  const selectedRecord = useMemo(() => {
    const explicitRecord =
      records.find((record) => record.id === selectedRecordId) ?? null;

    if (detailMode === "record") {
      return explicitRecord ?? records[0] ?? null;
    }

    if (selectedOutcome) {
      return findRecordForOutcome(records, selectedOutcome);
    }

    return null;
  }, [detailMode, records, selectedOutcome, selectedRecordId]);
  const selectedArchiveRecord = useMemo(
    () =>
      archivePayload?.records.find(
        (record) => record.id === selectedArchiveRecordId,
      ) ??
      archivePayload?.records[0] ??
      null,
    [archivePayload?.records, selectedArchiveRecordId],
  );
  const sidebarRecords =
    workspaceTab === "archive" ? archivePayload?.records ?? [] : records;
  const sidebarSelectedRecord =
    workspaceTab === "archive" ? selectedArchiveRecord : selectedRecord;
  const sidebarSelectedRecordId =
    workspaceTab === "archive"
      ? selectedArchiveRecord?.id ?? null
      : selectedRecord?.id ?? selectedRecordId;

  useEffect(() => {
    if (workspaceTab === "archive" && !archivePayload && !isArchiveLoading) {
      void refreshArchivePayload();
    }
  }, [archivePayload, isArchiveLoading, workspaceTab]);

  function syncLocalSelection(
    nextResultFilter: ResearchDeskResultFilter,
    nextReviewTagFilter: ResearchDeskReviewTagFilter,
  ) {
    const nextFilteredOutcomes = filterOutcomes(chartState.chart.outcomes, {
      resultFilter: nextResultFilter,
      reviewTagFilter: nextReviewTagFilter,
    });
    const nextOutcomeId = resolveOutcomeId(nextFilteredOutcomes, {
      preferredOutcomeId: selectedOutcomeId,
      preferredRecordId: selectedRecordId,
      allowFirstOutcomeFallback: true,
    });
    const nextOutcome =
      chartState.chart.outcomes.find((outcome) => outcome.id === nextOutcomeId) ??
      null;

    setSelectedOutcomeId(nextOutcomeId);

    if (nextOutcome) {
      const nextRecord = findRecordForOutcome(records, nextOutcome);

      setDetailMode("outcome");
      setSelectedRecordId(nextRecord?.id ?? null);

      return;
    }

    setDetailMode("record");
  }

  async function refreshChartSlice(
    nextSelection: ResearchDeskSelection,
    options: ChartRefreshOptions = {},
  ) {
    const requestId = chartRequestIdRef.current + 1;
    chartRequestIdRef.current = requestId;
    setIsChartLoading(true);
    setChartError(null);

    try {
      const payload = await parseResponse<ResearchDeskChartSlicePayload>(
        await fetch(buildChartRequestUrl(nextSelection), {
          cache: "no-store",
        }),
      );

      if (chartRequestIdRef.current !== requestId) {
        return;
      }

      const nextReviewTagFilter = hasReviewTagOption(
        reviewTagFilter,
        payload.reviewTagOptions,
      )
        ? reviewTagFilter
        : null;
      const nextFilteredOutcomes = filterOutcomes(payload.chart.outcomes, {
        resultFilter,
        reviewTagFilter: nextReviewTagFilter,
      });
      const nextOutcomeId = resolveOutcomeId(nextFilteredOutcomes, {
        preferredOutcomeId: options.preferredOutcomeId,
        preferredRecordId: options.preferredRecordId ?? selectedRecordId,
        fallbackOutcomeId: options.allowFallbackOutcome
          ? payload.selectedOutcomeId
          : null,
        allowFirstOutcomeFallback: options.allowFallbackOutcome ?? true,
      });
      const nextOutcome =
        payload.chart.outcomes.find((outcome) => outcome.id === nextOutcomeId) ??
        null;
      const nextRecord = findRecordForOutcome(records, nextOutcome);

      setSelection(payload.selection);
      setChartState({
        reviewTagOptions: payload.reviewTagOptions,
        summary: payload.summary,
        chart: payload.chart,
      });
      setReviewTagFilter(nextReviewTagFilter);
      setSelectedOutcomeId(nextOutcomeId);

      if (nextOutcome) {
        setDetailMode("outcome");
        setSelectedRecordId(nextRecord?.id ?? null);

        return;
      }

      setDetailMode("record");

      if (options.preferredRecordId) {
        setSelectedRecordId(options.preferredRecordId);
      }
    } catch (error) {
      if (chartRequestIdRef.current === requestId) {
        setChartError(error instanceof Error ? error.message : "研究图切片加载失败");
      }
    } finally {
      if (chartRequestIdRef.current === requestId) {
        setIsChartLoading(false);
      }
    }
  }

  async function refreshRecords() {
    const payload = await parseResponse<{ records: ResearchDeskRecord[] }>(
      await fetch("/api/trader-records", { cache: "no-store" }),
    );
    setRecords(payload.records);
    return payload.records;
  }

  async function refreshArchivePayload(options: {
    recordId?: string | null;
    q?: string;
  } = {}) {
    setIsArchiveLoading(true);
    setArchiveError(null);

    try {
      const payload = await parseResponse<ResearchDeskArchivePayload>(
        await fetch(
          buildArchiveRequestUrl({
            selection,
            recordId: options.recordId ?? selectedArchiveRecordId,
            q: options.q ?? archiveQuery,
          }),
          { cache: "no-store" },
        ),
      );

      setArchivePayload(payload);
      setSelectedArchiveRecordId(payload.selectedRecordId);
    } catch (error) {
      setArchiveError(
        error instanceof Error ? error.message : "归档分析加载失败",
      );
    } finally {
      setIsArchiveLoading(false);
    }
  }

  async function refreshCandidates() {
    const payload = await parseResponse<{ candidates: typeof initialData.candidates }>(
      await fetch("/api/strategy-candidates", { cache: "no-store" }),
    );
    setCandidates(payload.candidates);
    return payload.candidates;
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
    setSelectedOutcomeId(null);
    setDetailMode("record");
    setWorkspaceTab("active");

    await refreshChartSlice(selection, {
      preferredRecordId: payload.record.id,
      allowFallbackOutcome: false,
    });
  }

  async function handleUpdateRecord(recordId: string, input: UpdateRecordRequest) {
    const payload = await parseResponse<{ record: ResearchDeskRecord }>(
      await fetch(`/api/trader-records/${recordId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );

    await refreshRecords();
    setSelectedRecordId(payload.record.id);
    setDetailMode("record");
    await Promise.all([
      refreshChartSlice(selection, {
        preferredRecordId: payload.record.id,
        allowFallbackOutcome: true,
      }),
      refreshCandidates(),
    ]);
  }

  async function handleArchiveRecord(recordId: string) {
    await parseResponse<{ record: ResearchDeskRecord }>(
      await fetch(`/api/trader-records/${recordId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      }),
    );

    const nextRecords = await refreshRecords();
    const nextSelectedRecordId = nextRecords[0]?.id ?? null;
    await Promise.all([
      refreshChartSlice(selection, {
        preferredRecordId: nextSelectedRecordId,
        allowFallbackOutcome: true,
      }),
      refreshCandidates(),
      refreshArchivePayload({ recordId }),
    ]);

    if (!nextSelectedRecordId) {
      setSelectedRecordId(null);
      setSelectedOutcomeId(null);
      setDetailMode("record");
    }
  }

  async function handleSetRecordStatus(
    recordId: string,
    status: Exclude<ResearchDeskRecordStatus, "archived">,
  ) {
    const payload = await parseResponse<{ record: ResearchDeskRecord }>(
      await fetch(`/api/trader-records/${recordId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-status", status }),
      }),
    );

    setRecords((current) =>
      current.map((record) =>
        record.id === payload.record.id ? payload.record : record,
      ),
    );
    setSelectedRecordId(payload.record.id);
  }

  async function handleSaveArchiveSummary(
    recordId: string,
    archiveSummary: string,
  ) {
    const payload = await parseResponse<{ record: ResearchDeskRecord }>(
      await fetch(`/api/trader-records/${recordId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update-archive-summary",
          archiveSummary,
        }),
      }),
    );

    setArchivePayload((current) =>
      current
        ? {
            ...current,
            records: current.records.map((record) =>
              record.id === payload.record.id ? payload.record : record,
            ),
          }
        : current,
    );
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
    await refreshChartSlice(selection, {
      preferredOutcomeId: selectedOutcomeId,
      preferredRecordId: selectedRecordId,
      allowFallbackOutcome: true,
    });
  }

  async function handleRegenerateCandidates() {
    setCandidateMessage(null);
    setCandidateError(null);
    setIsRegeneratingCandidates(true);

    try {
      const payload = await parseResponse<{
        regenerated: number;
        candidates: typeof initialData.candidates;
      }>(await fetch("/api/strategy-candidates", { method: "POST" }));

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

  async function handleSaveReviewTags(reviewTags: string[]) {
    if (!selectedOutcome) {
      return;
    }

    await parseResponse<{ outcome: { id: string } }>(
      await fetch(`/api/record-outcomes/${selectedOutcome.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewTags }),
      }),
    );

    await refreshChartSlice(selection, {
      preferredOutcomeId: selectedOutcome.id,
      preferredRecordId: selectedRecordId,
      allowFallbackOutcome: true,
    });
  }

  function handleSelectionChange(nextSelection: ResearchDeskSelection) {
    if (!isSameSelection(selection, nextSelection)) {
      void refreshChartSlice(nextSelection, {
        preferredOutcomeId: selectedOutcomeId,
        preferredRecordId: selectedRecordId,
        allowFallbackOutcome: true,
      });
    }
  }

  function handleResultFilterChange(nextFilter: ResearchDeskResultFilter) {
    setResultFilter(nextFilter);
    syncLocalSelection(nextFilter, reviewTagFilter);
  }

  function handleReviewTagFilterChange(nextReviewTagFilter: ResearchDeskReviewTagFilter) {
    setReviewTagFilter(nextReviewTagFilter);
    syncLocalSelection(resultFilter, nextReviewTagFilter);
  }

  function handleSelectOutcome(outcomeId: string) {
    const nextOutcome = chartState.chart.outcomes.find(
      (outcome) => outcome.id === outcomeId,
    );
    const nextRecord = findRecordForOutcome(records, nextOutcome ?? null);

    setSelectedOutcomeId(outcomeId);
    setDetailMode("outcome");
    setSelectedRecordId(nextRecord?.id ?? null);
  }

  function handleSelectRecord(recordId: string) {
    const matchedOutcome = findOutcomeForRecord(filteredOutcomes, recordId);

    setSelectedRecordId(recordId);
    setSelectedOutcomeId(matchedOutcome?.id ?? null);
    setDetailMode("record");
  }

  function handleSelectSidebarRecord(recordId: string) {
    if (workspaceTab === "archive") {
      setSelectedArchiveRecordId(recordId);
      void refreshArchivePayload({ recordId });
      return;
    }

    handleSelectRecord(recordId);
  }

  return (
    <ResearchDeskWorkspaceShell
      sidebar={
        <ResearchDeskSidebar
          traders={traders}
          records={sidebarRecords}
          selectedRecord={sidebarSelectedRecord}
          selectedRecordId={sidebarSelectedRecordId}
          summary={
            workspaceTab === "archive"
              ? archivePayload?.summary ?? filteredSummary
              : filteredSummary
          }
          databaseRuntime={databaseRuntime}
          selectorMode={workspaceTab === "archive" ? "archive" : "active"}
          onCreateTrader={handleCreateTrader}
          onCreateRecord={handleCreateRecord}
          onSelectRecord={handleSelectSidebarRecord}
          onSetRecordStatus={handleSetRecordStatus}
          onArchiveRecord={handleArchiveRecord}
        />
      }
    >
      <ResearchDeskMainTabs
        value={workspaceTab}
        onValueChange={(nextTab) => {
          setWorkspaceTab(nextTab);
          if (nextTab === "archive") {
            void refreshArchivePayload();
          }
        }}
        activePanel={
          <ActiveRecordsPanel
            records={records}
            selectedRecordId={selectedRecord?.id ?? selectedRecordId}
            onSelectRecord={handleSelectRecord}
          >
            <ResearchDeskFirstScreen
              selection={selection}
              resultFilter={resultFilter}
              reviewTagFilter={reviewTagFilter}
              reviewTagOptions={chartState.reviewTagOptions}
              filteredOutcomes={filteredOutcomes}
              filteredSummary={filteredSummary}
              selectedOutcome={selectedOutcome}
              selectedRecord={selectedRecord}
              records={records}
              chartCandles={chartState.chart.candles}
              chartError={chartError}
              isChartLoading={isChartLoading}
              onSelectionChange={handleSelectionChange}
              onResultFilterChange={handleResultFilterChange}
              onReviewTagFilterChange={handleReviewTagFilterChange}
              onSelectOutcome={handleSelectOutcome}
              onSaveReviewTags={handleSaveReviewTags}
              onSettlePlan={handleSettlePlan}
            />
          </ActiveRecordsPanel>
        }
        recordsPanel={
          <AllRecordsPanel
            traders={traders}
            records={records}
            selectedRecordId={selectedRecord?.id ?? selectedRecordId}
            onSelectRecord={handleSelectRecord}
            onCreateTrader={handleCreateTrader}
            onCreateRecord={handleCreateRecord}
            onUpdateRecord={handleUpdateRecord}
          />
        }
        archivePanel={
          <ArchiveAnalysisPanel
            payload={archivePayload}
            selectedRecord={selectedArchiveRecord}
            isLoading={isArchiveLoading}
            error={archiveError}
            query={archiveQuery}
            onQueryChange={setArchiveQuery}
            onRefresh={() => void refreshArchivePayload({ q: archiveQuery })}
            onSelectRecord={(recordId) => {
              setSelectedArchiveRecordId(recordId);
              void refreshArchivePayload({ recordId });
            }}
            onSaveArchiveSummary={handleSaveArchiveSummary}
          />
        }
        candidatesPanel={
          <StrategyCandidateList
            candidates={candidates}
            onRegenerate={handleRegenerateCandidates}
            isLoading={isRegeneratingCandidates}
            message={candidateMessage}
            error={candidateError}
          />
        }
      />
    </ResearchDeskWorkspaceShell>
  );
}
