import { ResearchDesk } from "@/components/research-desk/research-desk";

export default async function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <ResearchDesk
        initialData={{
          selection: { symbol: "BTC", timeframe: "1h" },
          traders: [],
          records: [],
          selectedRecordId: null,
          candidates: [],
          chart: { candles: [], markers: [] },
        }}
      />
    </main>
  );
}
