export const DEFAULT_LOCAL_DATABASE_URL = "file:./prisma/dev.db";

type DatabaseRuntimeEnv = {
  [key: string]: string | undefined;
  DATABASE_URL?: string;
  LOCAL_DATABASE_URL?: string;
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

export function resolveLocalDevelopmentEnv(
  env: DatabaseRuntimeEnv,
): DatabaseRuntimeEnv {
  const localDatabaseUrl = resolvePrismaCliDatabaseUrl(env);

  return {
    ...env,
    DATABASE_URL: localDatabaseUrl,
    LOCAL_DATABASE_URL: localDatabaseUrl,
    TURSO_DATABASE_URL: "",
    TURSO_AUTH_TOKEN: "",
  };
}
