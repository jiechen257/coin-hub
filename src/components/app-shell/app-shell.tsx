import type { ReactNode } from "react";
import { AppNav } from "@/components/app-shell/app-nav";

type AppShellProps = {
  children: ReactNode;
};

/**
 * 提供控制台公共外壳，统一头部品牌信息与共享导航。
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">
              策略控制台
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Coin Hub
            </h1>
          </div>
          <AppNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
