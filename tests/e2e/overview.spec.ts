import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { expect, test } from "playwright/test";

// 生成唯一文本，避免并行 E2E 共享数据库时互相撞到同名记录。
function buildUniqueLabel(prefix: string) {
  return `${prefix} ${crypto.randomUUID()}`;
}

// 把 UTC 时间格式化成首页摘要条使用的文本，保证断言与页面展示口径一致。
function formatUtcDateTime(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hour = String(value.getUTCHours()).padStart(2, "0");
  const minute = String(value.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

test("home overview surfaces strategy status and quick actions", async ({
  page,
}) => {
  const now = Date.now();
  const strategyVersion = buildUniqueLabel("strategy-v18");
  const configSummary = buildUniqueLabel("guardrails v18");
  const warningText = buildUniqueLabel("BTC 需要复核");
  // 把最新快照时间略微放到当前时间之后，避免本地 worker 并发写入时盖掉测试种子。
  const latestRunAt = new Date(now + 5 * 60 * 1000);
  const queuedCreatedAt = new Date(now - 2 * 60 * 60 * 1000);
  const failedCreatedAt = new Date(now - 3 * 60 * 60 * 1000);
  const failedCompletedAt = new Date(now - 2.5 * 60 * 60 * 1000);
  const replayCreatedAt = new Date(now - 6 * 60 * 60 * 1000);
  const replayCompletedAt = new Date(now - 5.5 * 60 * 60 * 1000);
  const replayFromTime = new Date(now - 12 * 60 * 60 * 1000);
  const replayToTime = new Date(now - 8 * 60 * 60 * 1000);
  const activeConfig = await db.configVersion.create({
    data: {
      summary: configSummary,
      paramsJson: { riskPct: 0.65 },
      isActive: true,
    },
  });

  const seededRun = await db.runSnapshot.create({
    data: {
      mode: "manual",
      strategyVersion,
      warningsJson: [warningText],
      assetsJson: {
        BTC: {
          status: "ready",
          confidence: 0.91,
          evidence: ["BTC evidence 1", "BTC evidence 2"],
        },
        ETH: {
          status: "watch",
          confidence: 0.61,
          evidence: ["ETH evidence 1"],
        },
      },
      inputRefsJson: Prisma.JsonNull,
      degradedAssetsJson: ["ETH"],
      createdAt: latestRunAt,
    },
  });

  const queuedJob = await db.job.create({
    data: {
      type: "analysis",
      status: "queued",
      payloadJson: { mode: "manual" },
      createdAt: queuedCreatedAt,
    },
  });

  const failedJob = await db.job.create({
    data: {
      type: "analysis",
      status: "failed",
      payloadJson: { mode: "manual" },
      error: "boom",
      completedAt: failedCompletedAt,
      createdAt: failedCreatedAt,
    },
  });

  const seededReplay = await db.replayJob.create({
    data: {
      fromTime: replayFromTime,
      toTime: replayToTime,
      status: "completed",
      resultJson: { snapshotCount: 1, assetCount: 2 },
      completedAt: replayCompletedAt,
      createdAt: replayCreatedAt,
      configVersionId: activeConfig.id,
    },
  });

  let queuedAnalysisJobId: string | null = null;

  try {
    // 先确认首页聚合接口已经看见测试种子，再打开页面，避免并发写入造成首屏读到旧状态。
    await expect.poll(async () => {
      const response = await page.request.get("/api/overview");
      const payload = (await response.json()) as {
        marketSummary: {
          strategyVersion: string | null;
        };
      };

      return payload.marketSummary.strategyVersion;
    }).toBe(strategyVersion);

    await page.goto("http://localhost:3000/");

    await expect(page.getByRole("heading", { name: "策略总览" })).toBeVisible();
    await expect(page.getByText(strategyVersion, { exact: true })).toBeVisible();
    await expect(page.getByText(formatUtcDateTime(latestRunAt), { exact: true })).toBeVisible();
    await expect(page.getByText(warningText)).toBeVisible();
    await expect(page.getByRole("heading", { name: "ETH", level: 3 })).toBeVisible();
    await expect(page.getByText("队列中", { exact: false })).toBeVisible();
    await expect(page.getByText("24 小时运行", { exact: false })).toBeVisible();
    await expect(page.getByText("24 小时回放", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "配置摘要" })).toBeVisible();
    await expect(page.getByRole("button", { name: "运行分析" })).toBeVisible();
    await expect(page.getByRole("link", { name: "提交回放" })).toBeVisible();
    await expect(page.getByRole("link", { name: "查看分析" })).toBeVisible();
    await expect(page.getByRole("link", { name: "运行历史" })).toBeVisible();
    await expect(page.getByRole("link", { name: "查看配置" })).toBeVisible();

    // 点击首页的运行分析后，既要命中入队接口，也要刷新首页聚合数据并反映新的操作状态。
    const [runResponse, overviewResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().endsWith("/api/analysis/run"),
      ),
      page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().endsWith("/api/overview"),
      ),
      page.getByRole("button", { name: "运行分析" }).click(),
    ]);

    const queuedAnalysisJob = (await runResponse.json()) as {
      job: { id: string };
    };
    queuedAnalysisJobId = queuedAnalysisJob.job.id;

    const refreshedOverview = (await overviewResponse.json()) as {
      operations: {
        queuedJobCount: number;
        recentRunCount24h: number;
      };
    };

    expect(
      refreshedOverview.operations.queuedJobCount !== 1 ||
        refreshedOverview.operations.recentRunCount24h !== 1,
    ).toBeTruthy();
    await expect(page.getByText(/分析任务已提交/)).toBeVisible();

    if (refreshedOverview.operations.queuedJobCount !== 1) {
      await expect(
        page.getByText(`队列中 ${refreshedOverview.operations.queuedJobCount}`, {
          exact: true,
        }),
      ).toBeVisible();
    }

    if (refreshedOverview.operations.recentRunCount24h !== 1) {
      await expect(
        page.getByText(
          `24 小时运行 ${refreshedOverview.operations.recentRunCount24h}`,
          {
            exact: true,
          },
        ),
      ).toBeVisible();
    }
  } finally {
    // 无论用例成功还是失败，都精准回收本次种入的数据，避免共享测试库被长期污染。
    await db.replayJob.deleteMany({
      where: { id: seededReplay.id },
    });
    await db.job.deleteMany({
      where: {
        id: {
          in: [queuedJob.id, failedJob.id, queuedAnalysisJobId ?? ""],
        },
      },
    });
    await db.runSnapshot.deleteMany({
      where: { strategyVersion },
    });
    await db.configVersion.deleteMany({
      where: { id: activeConfig.id },
    });
  }
});
