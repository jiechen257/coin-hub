import { loadResearchDeskPayload } from "@/components/research-desk/research-desk-data";
import { ResearchDesk } from "@/components/research-desk/research-desk";

export default async function HomePage() {
  const initialData = await loadResearchDeskPayload({
    symbol: "BTC",
    timeframe: "1h",
  });

  return (
    <main className="min-h-screen px-6 py-8">
      <ResearchDesk initialData={initialData} />
    </main>
  );
}
