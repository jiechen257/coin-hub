import type { OverviewPayload } from "@/modules/overview/overview-service";

type OverviewOperationsPanelProps = {
  operations: OverviewPayload["operations"];
};

// 将 UTC 时间格式化成短时间戳，方便把失败任务放进高密度的操作面板。
function formatUtcDateTime(value: string) {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

// 操作面板把排队、运行和失败作业收拢在一个区域里，方便快速判断系统是否需要处理。
export function OverviewOperationsPanel({
  operations,
}: OverviewOperationsPanelProps) {
  const statItems = [
    { label: "队列中", value: operations.queuedJobCount },
    { label: "24 小时运行", value: operations.recentRunCount24h },
    { label: "24 小时回放", value: operations.recentReplayCount24h },
  ];

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4 shadow-sm shadow-slate-950/20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
            任务与运行
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">操作面板</h2>
        </div>
        <p className="text-sm text-slate-400">
          失败作业 {operations.recentFailedJobs.length} 条
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {statItems.map((item) => (
          <article
            key={item.label}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
          >
            <p className="text-sm text-slate-400">
              {item.label}{" "}
              <span className="text-2xl font-semibold text-white">
                {item.value}
              </span>
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm text-slate-400">最近失败作业</p>
        {operations.recentFailedJobs.length > 0 ? (
          <div className="mt-3 space-y-3">
            {operations.recentFailedJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-lg border border-rose-400/15 bg-rose-400/8 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-white">
                      {job.type}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">
                      {job.id}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatUtcDateTime(job.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {job.error ?? "没有记录错误信息。"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">最近没有失败作业。</p>
        )}
      </div>
    </section>
  );
}
