import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, getSessionCookieOptions } from "@/modules/auth/auth-service";

function buildLogoutResponse(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  // 通过过期 cookie 清掉单用户会话。
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  return response;
}

export async function POST(request: Request) {
  return buildLogoutResponse(request);
}

export async function GET(request: Request) {
  return buildLogoutResponse(request);
}
