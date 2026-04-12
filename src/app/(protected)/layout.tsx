import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
