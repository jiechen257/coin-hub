type ResearchDeskProps = {
  initialData: {
    selection: { symbol: "BTC" | "ETH"; timeframe: "15m" | "1h" | "4h" | "1d" };
    traders: unknown[];
    records: unknown[];
    selectedRecordId: string | null;
    candidates: unknown[];
    chart: { candles: unknown[]; markers: unknown[] };
  };
};

export function ResearchDesk({ initialData }: ResearchDeskProps) {
  return (
    <section className="grid gap-6">
      <header className="space-y-2">
        <p className="text-sm text-sky-300">Coin Hub</p>
        <div className="space-y-1">
          <h1 className="text-4xl font-semibold text-white">交易员策略研究台</h1>
          <p className="text-sm text-slate-300">
            {initialData.selection.symbol} · {initialData.selection.timeframe}
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
