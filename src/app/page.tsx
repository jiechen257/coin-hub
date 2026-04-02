import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/modules/auth/auth-service";

export default async function HomePage() {
  const cookieStore = await cookies();

  if (isAuthenticated(cookieStore)) {
    redirect("/config");
  }

  redirect("/login");
}
