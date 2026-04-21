import { loadResearchDeskPayload } from "@/components/research-desk/research-desk-data";
import { ResearchDesk } from "@/components/research-desk/research-desk";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialData = await loadResearchDeskPayload({
    symbol: "BTC",
    timeframe: "1h",
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1900px] flex-col px-3 py-4 sm:px-5 sm:py-6 xl:px-8 xl:py-8">
      <ResearchDesk initialData={initialData} />
    </main>
  );
}
