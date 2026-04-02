import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  createSessionToken,
  getSessionCookieOptions,
  verifyLogin,
} from "@/modules/auth/auth-service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (!(await verifyLogin(password))) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/config", request.url), 303);
  response.cookies.set(
    AUTH_SESSION_COOKIE,
    createSessionToken(),
    getSessionCookieOptions(),
  );

  return response;
}
