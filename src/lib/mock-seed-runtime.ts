import {
  resolveLocalDevelopmentRuntime,
  type LocalDevelopmentDatabaseTarget,
} from "@/lib/database-runtime";

type MockSeedEnv = {
  [key: string]: string | undefined;
  COIN_HUB_ALLOW_REMOTE_MOCK_SEED?: string;
};

export function resolveMockSeedRuntime(
  env: MockSeedEnv,
  targetOverride?: string,
) {
  const runtime = resolveLocalDevelopmentRuntime(env, targetOverride);
  const remoteSeedAllowed = env.COIN_HUB_ALLOW_REMOTE_MOCK_SEED === "1";

  if (runtime.target !== "local" && !remoteSeedAllowed) {
    throw new Error(
      `Remote mock seed is blocked for target=${runtime.target}. Set COIN_HUB_ALLOW_REMOTE_MOCK_SEED=1 to continue.`,
    );
  }

  return runtime as {
    target: LocalDevelopmentDatabaseTarget;
    location: string;
    env: MockSeedEnv;
  };
}
