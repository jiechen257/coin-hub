import { loadResearchDeskPayload } from "@/components/research-desk/research-desk-data";
import { ResearchDesk } from "@/components/research-desk/research-desk";

export default async function HomePage() {
  const initialData = await loadResearchDeskPayload({
    symbol: "BTC",
    timeframe: "1h",
  });

  return (
    <main className="mx-auto min-h-screen max-w-[1840px] px-4 py-6 sm:px-6 sm:py-8">
      <ResearchDesk initialData={initialData} />
    </main>
  );
}
