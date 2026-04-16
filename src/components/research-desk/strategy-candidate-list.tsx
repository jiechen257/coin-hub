"use client";

import type { ResearchDeskCandidate } from "@/components/research-desk/research-desk-types";

type StrategyCandidateListProps = {
  candidates: ResearchDeskCandidate[];
  onRegenerate: () => Promise<void>;
};

export function StrategyCandidateList({
  candidates,
  onRegenerate,
}: StrategyCandidateListProps) {
  return (
    <section className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-sky-300/80">策略区</p>
          <h2 className="text-xl font-semibold text-white">候选策略</h2>
        </div>
        <button
          type="button"
          onClick={() => void onRegenerate()}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white"
        >
          归纳候选策略
        </button>
      </div>

      <div className="space-y-3">
        {candidates.map((candidate) => (
          <article
            key={candidate.id}
            className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300/80">
                  {candidate.marketContext ?? "未分类市场"}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  {candidate.triggerText}
                </h3>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
                样本数 {candidate.sampleCount}
              </span>
            </div>

            <div className="grid gap-1 text-sm text-slate-300">
              <p>入场：{candidate.entryText}</p>
              <p>风控：{candidate.riskText ?? "手动定义"}</p>
              <p>离场：{candidate.exitText ?? "手动定义"}</p>
            </div>

            <p className="text-sm text-emerald-200">
              胜率 {(candidate.winRate * 100).toFixed(0)}%
            </p>

            <div className="space-y-1 text-xs text-slate-400">
              {candidate.sampleRefs.map((sampleRef) => (
                <p key={sampleRef.sampleId}>
                  {sampleRef.traderName} · {sampleRef.rawContent}
                </p>
              ))}
            </div>
          </article>
        ))}

        {candidates.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 px-3 py-6 text-sm text-slate-400">
            还没有候选策略，先结算样本再归纳。
          </p>
        ) : null}
      </div>
    </section>
  );
}
