import { db } from "@/lib/db";

type OverviewAsset = {
  symbol: string;
  status: string;
  confidence: number | null;
  evidence: string[];
};

type OverviewFailedJob = {
  id: string;
  type: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
};

export type OverviewPayload = {
  marketSummary: {
    strategyVersion: string | null;
    latestRunAt: string | null;
    warnings: string[];
    degradedAssets: string[];
  };
  assets: OverviewAsset[];
  operations: {
    queuedJobCount: number;
    recentFailedJobs: OverviewFailedJob[];
    recentRunCount24h: number;
    recentReplayCount24h: number;
  };
  activeConfig: {
    summary: string | null;
    riskPct: number | null;
    versionId: string | null;
  };
};

const RECENT_WINDOW_HOURS = 24;
const MAX_FAILED_JOBS = 5;
const MAX_ASSET_EVIDENCE = 3;

// 将任意字符串数组收敛成字符串数组，避免脏数据把首页聚合打断。
function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((item): item is string => typeof item === "string");
}

// 将任意证据值收敛成字符串数组，并截断到首页展示上限。
function normalizeEvidence(evidence: unknown): string[] {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return normalizeStringArray(evidence).slice(0, MAX_ASSET_EVIDENCE);
}

// 将最新快照里的资产对象映射成首页可直接消费的数组，并截断证据长度。
function mapAssets(assetsJson: unknown): OverviewAsset[] {
  if (!assetsJson || typeof assetsJson !== "object") {
    return [];
  }

  return Object.entries(assetsJson as Record<string, unknown>).map(([symbol, asset]) => {
    const status =
      asset && typeof asset === "object" && typeof (asset as { status?: unknown }).status === "string"
        ? ((asset as { status: string }).status)
        : "unknown";
    const confidence =
      asset && typeof asset === "object" && typeof (asset as { confidence?: unknown }).confidence === "number"
        ? ((asset as { confidence: number }).confidence)
        : null;
    const evidence =
      asset && typeof asset === "object"
        ? normalizeEvidence((asset as { evidence?: unknown }).evidence)
        : [];

    return {
      symbol,
      status,
      confidence,
      evidence,
    };
  }).sort((left, right) => left.symbol.localeCompare(right.symbol));
}

// 从运行快照里提取告警和降级资产，保留为空状态的完整 shape。
function mapSnapshotSignals(snapshot: {
  warningsJson: unknown;
  degradedAssetsJson: unknown;
} | null) {
  if (!snapshot) {
    return {
      warnings: [],
      degradedAssets: [],
    };
  }

  return {
    warnings: normalizeStringArray(snapshot.warningsJson),
    degradedAssets: normalizeStringArray(snapshot.degradedAssetsJson),
  };
}

// 从生效配置里提取首页要展示的摘要字段。
function mapActiveConfig(record: {
  id: string;
  summary: string;
  paramsJson: unknown;
} | null) {
  const riskPct =
    record && typeof record.paramsJson === "object" && record.paramsJson !== null && typeof (record.paramsJson as { riskPct?: unknown }).riskPct === "number"
      ? ((record.paramsJson as { riskPct: number }).riskPct)
      : null;

  return {
    summary: record?.summary ?? null,
    riskPct,
    versionId: record?.id ?? null,
  };
}

// 把失败作业整理成前端需要的最小列表形态。
function mapFailedJob(record: {
  id: string;
  type: string;
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
}): OverviewFailedJob {
  return {
    id: record.id,
    type: record.type,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    error: record.error,
  };
}

// 统一计算最近 24 小时的起点，保证运行与回放统计口径一致。
function getRecentWindowStart(now = Date.now()): Date {
  return new Date(now - RECENT_WINDOW_HOURS * 60 * 60 * 1000);
}

// 聚合首页所需的运行、配置、作业与回放数据，且在空状态下保持可用。
export async function getOverviewPayload(): Promise<OverviewPayload> {
  const since = getRecentWindowStart();

  const [latestRun, activeConfig, queuedJobCount, recentRunCount24h, recentReplayCount24h, recentFailedJobs] =
    await Promise.all([
      db.runSnapshot.findFirst({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      db.configVersion.findFirst({
        where: { isActive: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
      db.job.count({
        where: {
          status: {
            in: ["queued", "processing"],
          },
        },
      }),
      db.runSnapshot.count({
        where: {
          createdAt: {
            gte: since,
          },
        },
      }),
      db.replayJob.count({
        where: {
          createdAt: {
            gte: since,
          },
        },
      }),
      db.job.findMany({
        where: {
          status: "failed",
        },
        orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
        take: MAX_FAILED_JOBS,
      }),
  ]);

  // 最新快照缺失时，直接返回空安全结构，避免首页聚合因为空库而报错。
  const assets = latestRun ? mapAssets(latestRun.assetsJson) : [];
  const { warnings, degradedAssets } = mapSnapshotSignals(latestRun);
  const activeConfigPayload = mapActiveConfig(activeConfig);

  return {
    marketSummary: {
      strategyVersion: latestRun?.strategyVersion ?? null,
      latestRunAt: latestRun?.createdAt.toISOString() ?? null,
      warnings,
      degradedAssets,
    },
    assets,
    operations: {
      queuedJobCount,
      recentFailedJobs: recentFailedJobs.map(mapFailedJob),
      recentRunCount24h,
      recentReplayCount24h,
    },
    activeConfig: activeConfigPayload,
  };
}
