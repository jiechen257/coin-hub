import Link from "next/link";
import { db } from "@/lib/db";
import { formatRunMode } from "@/lib/display-text";
import { RunDetail, type RunDetailModel } from "@/components/runs/run-detail";

function mapRunSnapshot(record: {
  id: string;
  mode: string;
  strategyVersion: string;
  warningsJson: unknown;
  assetsJson: unknown;
  degradedAssetsJson: unknown;
  createdAt: Date;
}): RunDetailModel {
  return {
    id: record.id,
    mode: record.mode,
    strategyVersion: record.strategyVersion,
    warnings: (record.warningsJson as string[]) ?? [],
    assets: record.assetsJson as RunDetailModel["assets"],
    degradedAssets: (record.degradedAssetsJson as string[]) ?? [],
    createdAt: record.createdAt,
  };
}

type RunsPageProps = {
  searchParams?: Promise<{
    runId?: string;
  }>;
};

export default async function RunsPage({ searchParams }: RunsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const runs = await db.runSnapshot.findMany({
    orderBy: { createdAt: "desc" },
  });

  const normalizedRuns = runs.map(mapRunSnapshot);
  const selectedRun =
    normalizedRuns.find((run) => run.id === params?.runId) ?? normalizedRuns[0] ?? null;

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            运行工作台
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            运行历史
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            这里展示最近的双资产分析快照，点击任意记录查看详细输出、证据和告警。
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">快照列表</h2>
              <span className="text-sm text-slate-400">{normalizedRuns.length} 条记录</span>
            </div>

            <div className="mt-4 space-y-3">
              {normalizedRuns.map((run) => {
                const isSelected = selectedRun?.id === run.id;

                return (
                  <Link
                    key={run.id}
                    href={`/runs?runId=${run.id}`}
                    className={[
                      "block rounded-2xl border p-4 transition",
                      isSelected
                        ? "border-sky-400/40 bg-sky-400/10"
                        : "border-white/10 bg-white/[0.03] hover:border-sky-400/30 hover:bg-sky-400/5",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-white">{run.strategyVersion}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                          {run.id}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        {formatRunMode(run.mode)}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {normalizedRuns.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  还没有 run snapshot，先触发一次分析吧。
                </p>
              ) : null}
            </div>
          </aside>

          <RunDetail run={selectedRun} />
        </section>
      </section>
    </main>
  );
}
