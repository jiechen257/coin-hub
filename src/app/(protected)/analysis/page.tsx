import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { loadAnalysisPayload } from "@/components/analysis/analysis-data";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const initialData = await loadAnalysisPayload({
    symbol: "BTC",
    timeframe: "1h",
  });

  return (
    <main className="min-h-screen px-6 py-10">
      <AnalysisWorkspace initialData={initialData} />
    </main>
  );
}

