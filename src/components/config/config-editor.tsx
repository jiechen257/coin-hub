"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { ConfigVersion } from "@/modules/config/config-service";

type ConfigEditorProps = {
  currentVersion: ConfigVersion | null;
  versions: ConfigVersion[];
};

async function refreshPage() {
  window.location.reload();
}

export function ConfigEditor({ currentVersion, versions }: ConfigEditorProps) {
  const [summary, setSummary] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary,
          params: {
            riskPct: Number(riskPct),
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "保存失败");
      }

      await refreshPage();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "保存失败",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivate(versionId: string) {
    setIsActivating(versionId);
    setError(null);

    try {
      const response = await fetch(`/api/configs/${versionId}/activate`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "激活失败");
      }

      await refreshPage();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "激活失败",
      );
    } finally {
      setIsActivating(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/20 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              当前生效版本
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {currentVersion?.summary ?? "暂无生效配置"}
            </h2>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
            {currentVersion ? "生效中" : "未启用"}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">风险比例</dt>
            <dd className="mt-1 text-base text-white">
              {currentVersion?.params.riskPct ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">版本 ID</dt>
            <dd className="mt-1 break-all text-base text-white">
              {currentVersion?.id ?? "-"}
            </dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleCreate}>
          <label className="grid gap-2 text-sm text-slate-200">
            摘要
            <input
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="例如：提高置信度阈值"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            风险比例
            <input
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50"
              type="number"
              min="0"
              step="0.1"
              value={riskPct}
              onChange={(event) => setRiskPct(event.target.value)}
              required
            />
          </label>
          <button
            className="rounded-2xl bg-sky-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-500"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "创建新版本"}
          </button>
        </form>
      </section>

      <aside className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/20 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">版本历史</h2>
          <span className="text-sm text-slate-400">共 {versions.length} 个版本</span>
        </div>

        <div className="mt-4 space-y-3">
          {versions.map((version) => (
            <article
              key={version.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-4">
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

              <p className="mt-3 text-sm text-slate-300">
                风险比例：{version.params.riskPct}
              </p>

              {!version.isActive ? (
                <button
                  className="mt-4 rounded-xl border border-white/10 px-3 py-2 text-sm text-white transition hover:border-sky-400/40 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => void handleActivate(version.id)}
                  disabled={isActivating === version.id}
                >
                  {isActivating === version.id ? "生效中..." : "设为生效"}
                </button>
              ) : null}
            </article>
          ))}

          {versions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              暂时没有版本记录，先创建一个新版本吧。
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
