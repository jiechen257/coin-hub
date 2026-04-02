import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { isAuthenticated } from "@/modules/auth/auth-service";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const cookieStore = await cookies();

  if (!isAuthenticated(cookieStore)) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
