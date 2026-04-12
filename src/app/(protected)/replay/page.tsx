import { db } from "@/lib/db";
import { formatAssetStatus } from "@/lib/display-text";
import { getConfigVersionData } from "@/modules/config/config-service";
import { ReplayForm } from "@/components/replay/replay-form";

function formatReplayResult(resultJson: unknown) {
  if (!resultJson || typeof resultJson !== "object") {
    return null;
  }

  const summary = resultJson as {
    snapshotCount?: number;
    assetCount?: number;
  };

  return {
    snapshotCount: summary.snapshotCount ?? 0,
    assetCount: summary.assetCount ?? 0,
  };
}

export default async function ReplayPage() {
  const [{ versions }, replays] = await Promise.all([
    getConfigVersionData(),
    db.replayJob.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        configVersion: {
          select: {
            id: true,
            summary: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            回放工作台
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            回放实验室
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            在这里提交历史 replay，查看最近的 replay 记录，以及它们关联的配置版本。
          </p>
        </header>

        <ReplayForm versions={versions} />

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white">回放历史</h2>
              <span className="text-sm text-slate-400">{replays.length} 条任务</span>
            </div>

            <div className="mt-4 space-y-3">
              {replays.map((replay) => {
                const result = formatReplayResult(replay.resultJson);

                return (
                  <article
                    key={replay.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-white">{replay.configVersion?.summary ?? "No config version"}</h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                          {replay.id}
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200">
                        {formatAssetStatus(replay.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-300">
                      {replay.fromTime.toISOString().slice(0, 10)} →{" "}
                      {replay.toTime.toISOString().slice(0, 10)}
                    </p>

                    <dl className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">快照数</dt>
                        <dd className="mt-1 text-white">{result?.snapshotCount ?? 0}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">资产数</dt>
                        <dd className="mt-1 text-white">{result?.assetCount ?? 0}</dd>
                      </div>
                    </dl>

                    {result ? null : (
                      <p className="mt-3 text-sm text-slate-400">
                        该 replay 还没有生成结果摘要。
                      </p>
                    )}
                  </article>
                );
              })}

              {replays.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  还没有 replay 记录，先提交一个 replay job 吧。
                </p>
              ) : null}
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/20 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">配置版本</h2>
            <div className="mt-4 space-y-3">
              {versions.map((version) => (
                <article
                  key={version.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-white">{version.summary}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                        {version.id}
                      </p>
                    </div>
                    {version.isActive ? (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-200">
                        生效中
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}

              {versions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
                  暂时没有配置版本，先去配置页创建一个版本。
                </p>
              ) : null}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
