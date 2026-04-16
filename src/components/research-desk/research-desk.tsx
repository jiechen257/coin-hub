type ResearchDeskSelection = {
  symbol: "BTC" | "ETH";
  timeframe: "15m" | "1h" | "4h" | "1d";
};

type ResearchDeskProps = {
  selection: ResearchDeskSelection;
};

export function ResearchDesk({ selection }: ResearchDeskProps) {
  return (
    <section className="grid gap-6">
      <header className="space-y-2">
        <p className="text-sm text-sky-300">Coin Hub</p>
        <div className="space-y-1">
          <h1 className="text-4xl font-semibold text-white">交易员策略研究台</h1>
          <p className="text-sm text-slate-300">
            {selection.symbol} · {selection.timeframe}
          </p>
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-white/10 p-4">记录流</section>
        <section className="rounded-lg border border-white/10 p-4">K 线主视图</section>
        <section className="rounded-lg border border-white/10 p-4">候选策略</section>
      </div>
    </section>
  );
}
