import { CommandCenterDashboard } from "@/components/command-center/command-center-dashboard";

export default function CommandCenterPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">
            执行总览
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            命令中心
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            汇总最新的 BTC / ETH 分析结果，并保留一个手动分析入口，方便快速复核。
          </p>
        </header>

        <CommandCenterDashboard />
      </section>
    </main>
  );
}
