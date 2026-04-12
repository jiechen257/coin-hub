import { AppShell } from "@/components/app-shell/app-shell";
import { OverviewDashboard } from "@/components/overview/overview-dashboard";
import { getOverviewPayload } from "@/modules/overview/overview-service";

/**
 * 渲染根路由首页，把服务端总览数据直接送进首页控制台。
 */
export default async function HomePage() {
  const overview = await getOverviewPayload();

  return (
    <AppShell>
      <OverviewDashboard initialData={overview} />
    </AppShell>
  );
}
