import { vi } from "vitest";
import {
  AUTH_SESSION_COOKIE,
  createSessionToken,
  isAuthenticated,
  verifyLogin,
} from "@/modules/auth/auth-service";

afterEach(() => {
  vi.unstubAllEnvs();
});

function createCookieStore(value?: string) {
  return {
    get(name: string) {
      if (name !== AUTH_SESSION_COOKIE || !value) {
        return undefined;
      }

      return { value };
    },
  };
}

it("requires a configured app password before verifying login", async () => {
  vi.stubEnv("APP_PASSWORD", "");

  await expect(verifyLogin("secret-pass")).rejects.toThrow(
    "APP_PASSWORD is required",
  );
});

it("accepts the configured single-user password", async () => {
  vi.stubEnv("APP_PASSWORD", "secret-pass");

  await expect(verifyLogin("secret-pass")).resolves.toBe(true);
});

it("rejects a forged public session cookie", () => {
  vi.stubEnv("APP_PASSWORD", "secret-pass");

  expect(isAuthenticated(createCookieStore("authenticated"))).toBe(false);
});

it("accepts a signed session cookie", () => {
  vi.stubEnv("APP_PASSWORD", "secret-pass");

  const token = createSessionToken();

  expect(isAuthenticated(createCookieStore(token))).toBe(true);
});
