import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

export const AUTH_SESSION_COOKIE = "coin-hub-session";
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const AUTH_SESSION_VERSION = "v1";

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_MAX_AGE,
  };
}

type CookieStore = {
  get(name: string): { value: string } | undefined;
};

function signSessionPayload(payload: string) {
  return createHmac("sha256", getEnv().APP_PASSWORD)
    .update(payload)
    .digest("base64url");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * 服务端签名会话，避免公开固定 cookie 值被客户端直接伪造。
 */
export function createSessionToken(now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  const payload = `${AUTH_SESSION_VERSION}.${issuedAt}`;
  const signature = signSessionPayload(payload);

  return `${payload}.${signature}`;
}

export function isAuthenticated(cookieStore: CookieStore) {
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!token) {
    return false;
  }

  try {
    const [version, issuedAtRaw, signature] = token.split(".");

    if (version !== AUTH_SESSION_VERSION || !issuedAtRaw || !signature) {
      return false;
    }

    const issuedAt = Number(issuedAtRaw);

    if (!Number.isInteger(issuedAt)) {
      return false;
    }

    if (issuedAt + AUTH_SESSION_MAX_AGE < Math.floor(Date.now() / 1000)) {
      return false;
    }

    const payload = `${version}.${issuedAtRaw}`;
    const expectedSignature = signSessionPayload(payload);

    return safeCompare(signature, expectedSignature);
  } catch {
    return false;
  }
}

export async function verifyLogin(password: string) {
  return password === getEnv().APP_PASSWORD;
}
