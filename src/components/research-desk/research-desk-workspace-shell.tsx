"use client";

import type { ReactNode } from "react";

type ResearchDeskWorkspaceShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

export function ResearchDeskWorkspaceShell({
  sidebar,
  children,
}: ResearchDeskWorkspaceShellProps) {
  return (
    <section className="grid items-start gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] 2xl:gap-5">
      <aside className="xl:sticky xl:top-5">{sidebar}</aside>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
