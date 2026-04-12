import { db } from "@/lib/db";
import { createConfigVersion, getActiveConfigVersion } from "@/modules/config/config-repository";
import { configSchema, type ConfigInput } from "@/modules/config/config-schema";

export type ConfigVersion = {
  id: string;
  summary: string;
  params: ConfigInput;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class ConfigVersionNotFoundError extends Error {
  constructor(versionId: string) {
    super(`配置版本 ${versionId} 不存在。`);
    this.name = "ConfigVersionNotFoundError";
  }
}

export type SaveConfigInput = {
  summary: string;
  params: unknown;
};

type ConfigVersionRecord = {
  id: string;
  summary: string;
  paramsJson: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapConfigVersion(record: ConfigVersionRecord): ConfigVersion {
  return {
    id: record.id,
    summary: record.summary,
    params: configSchema.parse(record.paramsJson),
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function saveNewConfigVersion(
  input: SaveConfigInput,
): Promise<ConfigVersion> {
  // 先校验参数，再交给 repository 落库并切换 active。
  const params = configSchema.parse(input.params);

  return createConfigVersion({
    summary: input.summary,
    params,
  });
}

export async function listConfigVersions(): Promise<ConfigVersion[]> {
  const versions = await db.configVersion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return versions.map(mapConfigVersion);
}

export async function getConfigVersionData() {
  const [currentVersion, versions] = await Promise.all([
    getActiveConfigVersion(),
    listConfigVersions(),
  ]);

  return {
    currentVersion,
    versions,
  };
}

export async function activateConfigVersion(
  versionId: string,
): Promise<ConfigVersion> {
  const activated = await db.$transaction(async (tx) => {
    const target = await tx.configVersion.findUnique({
      where: { id: versionId },
    });

    if (!target) {
      throw new ConfigVersionNotFoundError(versionId);
    }

    await tx.configVersion.updateMany({
      where: { isActive: true, NOT: { id: versionId } },
      data: { isActive: false },
    });

    return tx.configVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    });
  });

  return mapConfigVersion(activated);
}
