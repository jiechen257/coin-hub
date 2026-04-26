export const DEFAULT_LOCAL_DATABASE_URL = "file:./prisma/dev.db";
export const LOCAL_DEVELOPMENT_DATABASE_TARGETS = [
  "daily",
  "production",
  "local",
] as const;

export type LocalDevelopmentDatabaseTarget =
  (typeof LOCAL_DEVELOPMENT_DATABASE_TARGETS)[number];

type DatabaseRuntimeEnv = {
  [key: string]: string | undefined;
  NODE_ENV?: "production" | "development" | "test";
  DATABASE_URL?: string;
  LOCAL_DATABASE_URL?: string;
  VERCEL_ENV?: string;
  COIN_HUB_REMOTE_DATABASE_ALLOWED?: string;
  COIN_HUB_DEV_DATABASE_TARGET?: string;
  TURSO_DAILY_DATABASE_URL?: string;
  TURSO_DAILY_AUTH_TOKEN?: string;
  TURSO_PRODUCTION_DATABASE_URL?: string;
  TURSO_PRODUCTION_AUTH_TOKEN?: string;
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
};

export type DatabaseRuntimeConfig =
  | {
      kind: "sqlite";
      url: string;
    }
  | {
      kind: "turso";
      url: string;
      authToken: string;
    };

export type PublicDatabaseRuntimeInfo = {
  target: "local" | "daily" | "production" | "remote";
  label: string;
  tone: "neutral" | "warning" | "danger";
};

function readEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseLocalDevelopmentTarget(
  value: string | undefined,
  source: "--target" | "COIN_HUB_DEV_DATABASE_TARGET",
) {
  const normalizedValue = readEnvValue(value)?.toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  if (
    LOCAL_DEVELOPMENT_DATABASE_TARGETS.includes(
      normalizedValue as LocalDevelopmentDatabaseTarget,
    )
  ) {
    return normalizedValue as LocalDevelopmentDatabaseTarget;
  }

  throw new Error(
    `${source} must be one of ${LOCAL_DEVELOPMENT_DATABASE_TARGETS.join(", ")}.`,
  );
}

function resolveTargetTursoSource(
  env: DatabaseRuntimeEnv,
  target: Exclude<LocalDevelopmentDatabaseTarget, "local">,
) {
  const urlKey =
    target === "daily"
      ? "TURSO_DAILY_DATABASE_URL"
      : "TURSO_PRODUCTION_DATABASE_URL";
  const tokenKey =
    target === "daily" ? "TURSO_DAILY_AUTH_TOKEN" : "TURSO_PRODUCTION_AUTH_TOKEN";
  const url = readEnvValue(env[urlKey]);
  const authToken = readEnvValue(env[tokenKey]);

  if (!url) {
    throw new Error(`${urlKey} is required when target=${target}.`);
  }

  if (!authToken) {
    throw new Error(`${tokenKey} is required when target=${target}.`);
  }

  return {
    url,
    authToken,
  };
}

export function resolveDatabaseRuntimeConfig(
  env: DatabaseRuntimeEnv,
): DatabaseRuntimeConfig {
  const databaseUrl = readEnvValue(env.DATABASE_URL);
  const tursoDatabaseUrl = readEnvValue(env.TURSO_DATABASE_URL);
  const tursoAuthToken = readEnvValue(env.TURSO_AUTH_TOKEN);
  const remoteDatabaseAllowed =
    env.NODE_ENV !== "development" ||
    env.COIN_HUB_REMOTE_DATABASE_ALLOWED === "1";

  if (tursoDatabaseUrl && remoteDatabaseAllowed) {
    if (!tursoAuthToken) {
      throw new Error("TURSO_AUTH_TOKEN is required when using Turso.");
    }

    return {
      kind: "turso",
      url: tursoDatabaseUrl,
      authToken: tursoAuthToken,
    };
  }

  const resolvedDatabaseUrl =
    databaseUrl?.startsWith("libsql://") && !remoteDatabaseAllowed
      ? DEFAULT_LOCAL_DATABASE_URL
      : databaseUrl ?? DEFAULT_LOCAL_DATABASE_URL;

  if (resolvedDatabaseUrl.startsWith("file:")) {
    return {
      kind: "sqlite",
      url: resolvedDatabaseUrl,
    };
  }

  if (resolvedDatabaseUrl.startsWith("libsql://")) {
    if (!tursoAuthToken) {
      throw new Error("TURSO_AUTH_TOKEN is required when using Turso.");
    }

    return {
      kind: "turso",
      url: resolvedDatabaseUrl,
      authToken: tursoAuthToken,
    };
  }

  throw new Error(
    "DATABASE_URL must use file: for SQLite. Set TURSO_DATABASE_URL for Turso deployments.",
  );
}

export function resolvePrismaCliDatabaseUrl(env: DatabaseRuntimeEnv) {
  const localDatabaseUrl = readEnvValue(env.LOCAL_DATABASE_URL);
  if (localDatabaseUrl) {
    if (!localDatabaseUrl.startsWith("file:")) {
      throw new Error("LOCAL_DATABASE_URL must use file: for SQLite.");
    }

    return localDatabaseUrl;
  }

  const databaseUrl = readEnvValue(env.DATABASE_URL);
  if (databaseUrl?.startsWith("file:")) {
    return databaseUrl;
  }

  return DEFAULT_LOCAL_DATABASE_URL;
}

export function resolveLocalDevelopmentTarget(
  env: DatabaseRuntimeEnv,
  targetOverride?: string,
): LocalDevelopmentDatabaseTarget {
  return (
    parseLocalDevelopmentTarget(targetOverride, "--target") ??
    parseLocalDevelopmentTarget(
      env.COIN_HUB_DEV_DATABASE_TARGET,
      "COIN_HUB_DEV_DATABASE_TARGET",
    ) ??
    "local"
  );
}

export function resolveLocalDevelopmentRuntime(
  env: DatabaseRuntimeEnv,
  targetOverride?: string,
) {
  const target = resolveLocalDevelopmentTarget(env, targetOverride);
  const localDatabaseUrl = resolvePrismaCliDatabaseUrl(env);

  if (target === "local") {
    return {
      target,
      location: localDatabaseUrl,
      env: {
        ...env,
        DATABASE_URL: localDatabaseUrl,
        LOCAL_DATABASE_URL: localDatabaseUrl,
        TURSO_DATABASE_URL: "",
        TURSO_AUTH_TOKEN: "",
      },
    };
  }

  const remoteSource = resolveTargetTursoSource(env, target);

  return {
    target,
    location: remoteSource.url,
    env: {
      ...env,
      DATABASE_URL: localDatabaseUrl,
      LOCAL_DATABASE_URL: localDatabaseUrl,
      TURSO_DATABASE_URL: remoteSource.url,
      TURSO_AUTH_TOKEN: remoteSource.authToken,
      COIN_HUB_REMOTE_DATABASE_ALLOWED: "1",
    },
  };
}

export function resolveLocalDevelopmentEnv(
  env: DatabaseRuntimeEnv,
  targetOverride?: string,
): DatabaseRuntimeEnv {
  return resolveLocalDevelopmentRuntime(env, targetOverride).env;
}

export function resolvePublicDatabaseRuntimeInfo(
  env: DatabaseRuntimeEnv,
): PublicDatabaseRuntimeInfo {
  const runtime = resolveDatabaseRuntimeConfig(env);

  if (runtime.kind === "sqlite") {
    return {
      target: "local",
      label: "本地 SQLite",
      tone: "neutral",
    };
  }

  const url = runtime.url;
  const dailyUrl = readEnvValue(env.TURSO_DAILY_DATABASE_URL);
  const productionUrl = readEnvValue(env.TURSO_PRODUCTION_DATABASE_URL);

  if (productionUrl && url === productionUrl) {
    return {
      target: "production",
      label: "生产 Turso",
      tone: "danger",
    };
  }

  if (dailyUrl && url === dailyUrl) {
    return {
      target: "daily",
      label: "日常 Turso",
      tone: "warning",
    };
  }

  if (env.VERCEL_ENV === "production") {
    return {
      target: "production",
      label: "生产 Turso",
      tone: "danger",
    };
  }

  return {
    target: "remote",
    label: "远端 Turso",
    tone: "warning",
  };
}
