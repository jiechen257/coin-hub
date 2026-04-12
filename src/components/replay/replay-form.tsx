"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ConfigVersion } from "@/modules/config/config-service";

type ReplayFormProps = {
  versions: ConfigVersion[];
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ReplayForm({ versions }: ReplayFormProps) {
  const router = useRouter();
  const [from, setFrom] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return toDateInputValue(start);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [configVersionId, setConfigVersionId] = useState(
    () => versions.find((version) => version.isActive)?.id ?? versions[0]?.id ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === configVersionId) ?? null,
    [configVersionId, versions],
  );

  useEffect(() => {
    if (configVersionId || versions.length === 0) {
      return;
    }

    setConfigVersionId(versions.find((version) => version.isActive)?.id ?? versions[0].id);
  }, [configVersionId, versions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/replays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          configVersionId: configVersionId || undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        jobId?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "提交 replay 失败");
      }

      setMessage(`回放任务已提交：${payload.jobId ?? "未知任务"}`);

      // 让服务器端的历史列表立即反映新 replay 记录。
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "提交 replay 失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/20 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
            回放实验室
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            提交回放任务
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            选择时间范围和配置版本后提交 replay，页面会刷新并把结果写入历史记录。
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-slate-300">
          {versions.length} 个可用版本
        </span>
      </div>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-slate-200">
          开始日期
          <input
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          结束日期
          <input
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-200 md:col-span-2">
          配置版本
          <select
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50"
            value={configVersionId}
            onChange={(event) => setConfigVersionId(event.target.value)}
            disabled={versions.length === 0}
          >
            {versions.length === 0 ? (
              <option value="">暂无配置版本</option>
            ) : null}
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.summary}
                {version.isActive ? "（生效中）" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button
            className="rounded-2xl bg-sky-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-500"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "提交中..." : "提交回放任务"}
          </button>
          <p className="text-sm text-slate-400">
            {selectedVersion ? `当前选择：${selectedVersion.summary}` : "尚未选择版本"}
          </p>
        </div>
      </form>

      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}
