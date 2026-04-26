// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { ResearchDesk } from "@/components/research-desk/research-desk";
import type {
  ResearchDeskArchivePayload,
  ResearchDeskOutcome,
  ResearchDeskPayload,
  ResearchDeskRecord,
} from "@/components/research-desk/research-desk-types";

const CREATE_RECORD_WITH_OUTCOME = {
  traderId: "trader-1",
  symbol: "BTC" as const,
  recordType: "view" as const,
  sourceType: "manual" as const,
  occurredAt: "2026-04-19T03:00:00.000Z",
  rawContent: "第三条记录",
  plans: [
    {
      label: "plan-3",
      side: "long" as const,
      triggerText: "第三条记录方案",
      entryText: "第三条记录入场",
    },
  ],
};

const CREATE_RECORD_WITHOUT_OUTCOME = {
  traderId: "trader-1",
  symbol: "BTC" as const,
  recordType: "view" as const,
  sourceType: "manual" as const,
  occurredAt: "2026-04-19T04:00:00.000Z",
  rawContent: "第四条记录",
  plans: [
    {
      label: "plan-4",
      side: "long" as const,
      triggerText: "第四条记录方案",
      entryText: "第四条记录入场",
    },
  ],
};

const UPDATE_RECORD = {
  traderId: "trader-1",
  symbol: "BTC" as const,
  recordType: "view" as const,
  sourceType: "manual" as const,
  occurredAt: "2026-04-19T01:30:00.000Z",
  rawContent: "第二条记录-已更新",
  plans: [
    {
      id: "plan-2",
      label: "plan-2",
      side: "long" as const,
      triggerText: "第二条记录方案-已更新",
      entryText: "第二条记录入场-已更新",
    },
  ],
};

vi.mock("@/components/research-desk/research-chart", () => ({
  ResearchChart: ({
    outcomes,
    selectedOutcomeId,
    onSelectOutcome,
  }: {
    outcomes: ResearchDeskOutcome[];
    selectedOutcomeId: string | null;
    onSelectOutcome: (outcomeId: string) => void;
  }) => (
    <div data-testid="research-chart">
      <div>研究图 mock {selectedOutcomeId ?? "none"}</div>
      {outcomes.map((outcome) => (
        <button
          key={outcome.id}
          type="button"
          onClick={() => onSelectOutcome(outcome.id)}
        >
          选择 outcome {outcome.id}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/analysis/price-chart", () => ({
  PriceChart: ({ title }: { title?: string }) => <div>{title ?? "PriceChart"}</div>,
}));

vi.mock("@/components/research-desk/record-detail", () => ({
  RecordDetail: ({ record }: { record: ResearchDeskRecord | null }) => (
    <div data-testid="record-detail">
      {record ? `record:${record.id}:${record.rawContent}` : "record:none"}
    </div>
  ),
}));

vi.mock("@/components/research-desk/outcome-detail", () => ({
  OutcomeDetail: ({ outcome }: { outcome: ResearchDeskOutcome | null }) => (
    <div data-testid="outcome-detail">
      {outcome ? `outcome:${outcome.id}` : "outcome:none"}
    </div>
  ),
}));

vi.mock("@/components/research-desk/record-composer-dialog", () => ({
  RecordComposerDialog: ({
    onCreateRecord,
  }: {
    onCreateRecord: (input: unknown) => Promise<void>;
  }) => (
    <div className="flex gap-2">
      <button type="button" onClick={() => void onCreateRecord(CREATE_RECORD_WITH_OUTCOME)}>
        新建记录
      </button>
      <button
        type="button"
        onClick={() => void onCreateRecord(CREATE_RECORD_WITHOUT_OUTCOME)}
      >
        新建无 outcome 记录
      </button>
    </div>
  ),
}));

vi.mock("@/components/research-desk/record-editor-dialog", () => ({
  RecordEditorDialog: ({
    record,
    onUpdateRecord,
  }: {
    record: ResearchDeskRecord;
    onUpdateRecord: (recordId: string, input: unknown) => Promise<void>;
  }) => (
    <button
      type="button"
      onClick={() => void onUpdateRecord(record.id, UPDATE_RECORD)}
    >
      编辑 {record.id}
    </button>
  ),
}));

vi.mock("@/components/research-desk/strategy-candidate-list", () => ({
  StrategyCandidateList: () => <h2>候选策略</h2>,
}));

function createOutcome(overrides: Partial<ResearchDeskOutcome>): ResearchDeskOutcome {
  return {
    id: "outcome-default",
    subjectType: "record",
    subjectId: "record-1",
    recordId: "record-1",
    planId: null,
    symbol: "BTC",
    timeframe: "1h",
    windowType: "trade-follow-through",
    windowStartAt: "2026-04-19T00:00:00.000Z",
    windowEndAt: "2026-04-19T02:00:00.000Z",
    resultLabel: "good",
    resultReason: "顺向阈值先命中",
    forwardReturnPercent: 4.2,
    maxFavorableExcursionPercent: 6.1,
    maxAdverseExcursionPercent: -1.4,
    ruleVersion: "v1",
    computedAt: "2026-04-19T03:00:00.000Z",
    reviewTags: ["趋势跟随"],
    ...overrides,
  };
}

function createRecord(overrides: Partial<ResearchDeskRecord>): ResearchDeskRecord {
  return {
    id: "record-default",
    traderId: "trader-1",
    symbol: "BTC",
    timeframe: "1h",
    recordType: "view",
    status: "not_started",
    sourceType: "manual",
    occurredAt: "2026-04-19T00:00:00.000Z",
    archivedAt: null,
    archiveSummary: null,
    completion: {
      missingBasics: [],
      missingPlans: [],
      missingReview: [],
      score: 100,
    },
    rawContent: "默认记录",
    notes: null,
    trader: {
      id: "trader-1",
      name: "交易员 A",
      platform: "x",
      notes: null,
    },
    executionPlans: [],
    ...overrides,
  };
}

function createInitialData(): ResearchDeskPayload {
  return {
    selection: {
      symbol: "BTC",
      timeframe: "1h",
    },
    selectedOutcomeId: "outcome-good",
    reviewTagOptions: [
      { label: "趋势跟随", kind: "preset" },
      { label: "止损纪律差", kind: "preset" },
    ],
    summary: {
      counts: {
        good: 1,
        neutral: 0,
        bad: 1,
        pending: 1,
        total: 3,
      },
      reviewTags: [
        { label: "趋势跟随", count: 1, kind: "preset" },
        { label: "止损纪律差", count: 1, kind: "preset" },
      ],
    },
    chart: {
      candles: [
        {
          openTime: "2026-04-19T00:00:00.000Z",
          open: 100,
          high: 105,
          low: 96,
          close: 103,
          volume: 10,
        },
      ],
      outcomes: [
        createOutcome({
          id: "outcome-good",
          subjectId: "record-1",
          recordId: "record-1",
          reviewTags: ["趋势跟随"],
        }),
        createOutcome({
          id: "outcome-bad",
          subjectType: "plan",
          subjectId: "plan-2",
          recordId: null,
          planId: "plan-2",
          resultLabel: "bad",
          resultReason: "逆向阈值先命中",
          forwardReturnPercent: -2.8,
          maxFavorableExcursionPercent: 0.8,
          maxAdverseExcursionPercent: -4.6,
          reviewTags: ["止损纪律差"],
        }),
        createOutcome({
          id: "outcome-pending",
          subjectId: "record-2",
          recordId: "record-2",
          resultLabel: "pending",
          resultReason: "窗口未结束",
          forwardReturnPercent: null,
          maxFavorableExcursionPercent: null,
          maxAdverseExcursionPercent: null,
          reviewTags: [],
        }),
      ],
    },
    traders: [
      {
        id: "trader-1",
        name: "交易员 A",
        platform: "x",
        notes: null,
      },
    ],
    records: [
      createRecord({
        id: "record-1",
        recordType: "trade",
        status: "in_progress",
        rawContent: "第一条记录",
        occurredAt: "2026-04-19T00:00:00.000Z",
      }),
      createRecord({
        id: "record-2",
        status: "ended",
        rawContent: "第二条记录",
        occurredAt: "2026-04-19T01:00:00.000Z",
        executionPlans: [
          {
            id: "plan-2",
            label: "plan-2",
            status: "pending",
            side: "long",
            entryPrice: null,
            exitPrice: null,
            stopLoss: null,
            takeProfit: null,
            marketContext: null,
            triggerText: "第二条记录方案",
            entryText: "第二条记录入场",
            riskText: null,
            exitText: null,
            notes: null,
            sample: null,
          },
        ],
      }),
      createRecord({
        id: "record-3",
        rawContent: "没有 outcome 的记录",
        occurredAt: "2026-04-19T02:00:00.000Z",
      }),
    ],
    selectedRecordId: "record-1",
    databaseRuntime: {
      target: "local",
      label: "本地 SQLite",
      tone: "neutral",
    },
    candidates: [
      {
        id: "candidate-1",
        marketContext: "BTC 1h",
        triggerText: "放量突破",
        entryText: "回踩确认后跟随",
        riskText: null,
        exitText: null,
        sampleCount: 2,
        winRate: 0.5,
        sampleRefs: [],
      },
    ],
  };
}

function createArchivePayload(record: ResearchDeskRecord): ResearchDeskArchivePayload {
  return {
    selection: {
      symbol: "BTC",
      timeframe: "1h",
    },
    records: [record],
    selectedRecordId: record.id,
    reviewTagOptions: [],
    summary: {
      counts: {
        good: 0,
        neutral: 0,
        bad: 0,
        pending: 0,
        total: 0,
      },
      reviewTags: [],
    },
    archiveStats: {
      recordCount: 1,
      summarizedCount: record.archiveSummary ? 1 : 0,
      unsummarizedCount: record.archiveSummary ? 0 : 1,
      goodRate: null,
      topReviewTags: [],
    },
    chart: {
      candles: [],
      outcomes: [],
    },
  };
}

function buildJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function buildChartSliceFromData(
  data: ResearchDeskPayload,
  overrides?: Partial<ResearchDeskPayload["chart"]> & {
    selectedOutcomeId?: string | null;
  },
) {
  return {
    selection: data.selection,
    selectedOutcomeId: overrides?.selectedOutcomeId ?? data.selectedOutcomeId,
    reviewTagOptions: data.reviewTagOptions,
    summary: data.summary,
    chart: {
      candles: overrides?.candles ?? data.chart.candles,
      outcomes: overrides?.outcomes ?? data.chart.outcomes,
    },
  };
}

function expectPanelsToContain(testId: string, value: string) {
  screen.getAllByTestId(testId).forEach((element) => {
    expect(element).toHaveTextContent(value);
  });
}

function expectPanelsNotToContain(testId: string, value: string) {
  screen.getAllByTestId(testId).forEach((element) => {
    expect(element).not.toHaveTextContent(value);
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renders the outcome-first first screen around the research chart", () => {
  render(<ResearchDesk initialData={createInitialData()} />);

  expect(
    screen.getByRole("heading", { name: "记录 K 线图工作台" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "TradingView 参考视图" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "新建记录" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "候选策略" })).toBeInTheDocument();
  expect(screen.getByText("数据源：")).toBeInTheDocument();
  expect(screen.getByText("本地 SQLite")).toBeInTheDocument();
});

it("shows recent ended records on the first screen when no records are running", () => {
  const initialData = {
    ...createInitialData(),
    records: createInitialData().records.map((record) => ({
      ...record,
      status: "ended" as const,
    })),
  };

  render(<ResearchDesk initialData={initialData} />);

  expect(screen.getByRole("heading", { name: "最近已结束记录" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /第一条记录/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /第二条记录/i })).toBeInTheDocument();
});

it("keeps the clicked record selected when that record has no outcome", async () => {
  const user = userEvent.setup();

  render(<ResearchDesk initialData={createInitialData()} />);

  await user.click(screen.getByRole("tab", { name: "全部记录" }));

  await user.click(
    screen.getByRole("button", {
      name: /没有 outcome 的记录/i,
    }),
  );
  await user.click(screen.getByRole("tab", { name: "运行中" }));

  expectPanelsToContain("record-detail", "record:record-3:没有 outcome 的记录");
  expectPanelsToContain("outcome-detail", "outcome:none");
  expect(screen.getByTestId("research-chart")).toHaveTextContent("研究图 mock none");
});

it("maps a plan outcome back to its owning record when recordId is null", async () => {
  const user = userEvent.setup();

  render(<ResearchDesk initialData={createInitialData()} />);

  await user.click(screen.getByRole("button", { name: "选择 outcome outcome-bad" }));

  expectPanelsToContain("outcome-detail", "outcome:outcome-bad");
  expectPanelsToContain("record-detail", "record:record-2:第二条记录");
  expectPanelsNotToContain("record-detail", "record:record-1:第一条记录");
});

it("refreshes chart slice after creating a record and keeps the new record selected when no outcome exists", async () => {
  const user = userEvent.setup();
  const initialData = createInitialData();
  const createdRecord = createRecord({
    id: "record-4",
    rawContent: "第四条记录",
    occurredAt: "2026-04-19T04:00:00.000Z",
  });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/trader-records" && init?.method === "POST") {
      return buildJsonResponse({ record: createdRecord });
    }

    if (url === "/api/research-desk/chart?symbol=BTC&timeframe=1h") {
      return buildJsonResponse(
        buildChartSliceFromData(initialData, {
          selectedOutcomeId: "outcome-good",
          outcomes: initialData.chart.outcomes,
        }),
      );
    }

    throw new Error(`Unexpected fetch ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<ResearchDesk initialData={initialData} />);

  await user.click(screen.getByRole("button", { name: "新建无 outcome 记录" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/research-desk/chart?symbol=BTC&timeframe=1h",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  expectPanelsToContain("record-detail", "record:record-4:第四条记录");
  expectPanelsToContain("outcome-detail", "outcome:none");
});

it("selects the refreshed outcome for the new record when the chart slice already contains it", async () => {
  const user = userEvent.setup();
  const initialData = createInitialData();
  const createdRecord = createRecord({
    id: "record-5",
    rawContent: "第三条记录",
    occurredAt: "2026-04-19T03:00:00.000Z",
  });
  const refreshedOutcome = createOutcome({
    id: "outcome-new",
    subjectId: "record-5",
    recordId: "record-5",
    reviewTags: ["趋势跟随"],
  });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/trader-records" && init?.method === "POST") {
      return buildJsonResponse({ record: createdRecord });
    }

    if (url === "/api/research-desk/chart?symbol=BTC&timeframe=1h") {
      return buildJsonResponse(
        buildChartSliceFromData(initialData, {
          selectedOutcomeId: "outcome-new",
          outcomes: [...initialData.chart.outcomes, refreshedOutcome],
        }),
      );
    }

    throw new Error(`Unexpected fetch ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<ResearchDesk initialData={initialData} />);

  await user.click(screen.getByRole("button", { name: "新建记录" }));

  await waitFor(() => {
    expectPanelsToContain("outcome-detail", "outcome:outcome-new");
  });

  expectPanelsToContain("record-detail", "record:record-5:第三条记录");
  expect(screen.getByTestId("research-chart")).toHaveTextContent(
    "研究图 mock outcome-new",
  );
});

it("updates summary count and tag heat from the active filter set", async () => {
  const user = userEvent.setup();

  render(<ResearchDesk initialData={createInitialData()} />);

  await user.click(screen.getByRole("button", { name: "正向结果" }));

  expect(screen.getByText("1 条正向结果")).toBeInTheDocument();
  expect(screen.getByText("趋势跟随 1")).toBeInTheDocument();
  expect(screen.queryByText("止损纪律差 1")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "全部结果" }));
  await user.click(screen.getByRole("button", { name: "止损纪律差" }));

  expect(screen.getByText("1 条结果")).toBeInTheDocument();
  expect(screen.queryByText("趋势跟随 1")).not.toBeInTheDocument();
  expect(screen.getByText("止损纪律差 1")).toBeInTheDocument();
});

it("refreshes record detail and candidates after editing a record", async () => {
  const user = userEvent.setup();
  const initialData = createInitialData();
  const updatedRecord = createRecord({
    id: "record-2",
    rawContent: "第二条记录-已更新",
    occurredAt: "2026-04-19T01:30:00.000Z",
    executionPlans: [
      {
        id: "plan-2",
        label: "plan-2",
        status: "pending",
        side: "long",
        entryPrice: null,
        exitPrice: null,
        stopLoss: null,
        takeProfit: null,
        marketContext: null,
        triggerText: "第二条记录方案-已更新",
        entryText: "第二条记录入场-已更新",
        riskText: null,
        exitText: null,
        notes: null,
        sample: null,
      },
    ],
  });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/trader-records/record-2" && init?.method === "PATCH") {
      return buildJsonResponse({ record: updatedRecord });
    }

    if (url === "/api/trader-records") {
      return buildJsonResponse({
        records: [
          initialData.records[0],
          updatedRecord,
          initialData.records[2],
        ],
      });
    }

    if (url === "/api/research-desk/chart?symbol=BTC&timeframe=1h") {
      return buildJsonResponse(buildChartSliceFromData(initialData));
    }

    if (url === "/api/strategy-candidates") {
      return buildJsonResponse({ candidates: initialData.candidates });
    }

    throw new Error(`Unexpected fetch ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<ResearchDesk initialData={initialData} />);

  await user.click(screen.getByRole("tab", { name: "全部记录" }));

  await user.click(
    screen.getByRole("button", {
      name: /第二条记录/i,
    }),
  );

  await user.click(screen.getByRole("button", { name: "编辑 record-2" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trader-records/record-2",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });
  await user.click(screen.getByRole("tab", { name: "运行中" }));

  await waitFor(() => {
    expectPanelsToContain("record-detail", "record:record-2:第二条记录-已更新");
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/strategy-candidates",
    expect.objectContaining({ cache: "no-store" }),
  );
});

it("archives a record and removes it from the visible list", async () => {
  const user = userEvent.setup();
  const initialData = createInitialData();
  const remainingRecords = [initialData.records[0], initialData.records[2]];
  const archivedRecord = {
    ...initialData.records[1],
    status: "archived" as const,
    archivedAt: "2026-04-26T12:00:00.000Z",
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === "/api/trader-records/record-2" && init?.method === "PATCH") {
      return buildJsonResponse({ record: archivedRecord });
    }

    if (url === "/api/trader-records") {
      return buildJsonResponse({ records: remainingRecords });
    }

    if (url === "/api/research-desk/chart?symbol=BTC&timeframe=1h") {
      return buildJsonResponse(buildChartSliceFromData(initialData));
    }

    if (url === "/api/strategy-candidates") {
      return buildJsonResponse({ candidates: initialData.candidates });
    }

    if (
      url === "/api/research-desk/archive?symbol=BTC&timeframe=1h&recordId=record-2"
    ) {
      return buildJsonResponse(createArchivePayload(archivedRecord));
    }

    throw new Error(`Unexpected fetch ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<ResearchDesk initialData={initialData} />);

  await user.click(screen.getByRole("tab", { name: "全部记录" }));
  await user.click(
    screen.getByRole("button", {
      name: /第二条记录/i,
    }),
  );
  await user.click(screen.getByRole("button", { name: "归档" }));

  await waitFor(() => {
    expect(
      screen.queryByRole("button", {
        name: /第二条记录/i,
      }),
    ).not.toBeInTheDocument();
  });
});
