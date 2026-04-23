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
  DATABASE_URL?: string;
  LOCAL_DATABASE_URL?: string;
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

  if (tursoDatabaseUrl) {
    if (!tursoAuthToken) {
      throw new Error("TURSO_AUTH_TOKEN is required when using Turso.");
    }

    return {
      kind: "turso",
      url: tursoDatabaseUrl,
      authToken: tursoAuthToken,
    };
  }

  const resolvedDatabaseUrl = databaseUrl ?? DEFAULT_LOCAL_DATABASE_URL;

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
    "daily"
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
    },
  };
}

export function resolveLocalDevelopmentEnv(
  env: DatabaseRuntimeEnv,
  targetOverride?: string,
): DatabaseRuntimeEnv {
  return resolveLocalDevelopmentRuntime(env, targetOverride).env;
}
