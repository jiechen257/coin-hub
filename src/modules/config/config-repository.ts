import { db } from "@/lib/db";
import { configSchema, type ConfigInput } from "@/modules/config/config-schema";

type StoredConfigVersion = {
  id: string;
  summary: string;
  params: ConfigInput;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapConfigVersion(record: {
  id: string;
  summary: string;
  paramsJson: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): StoredConfigVersion {
  return {
    id: record.id,
    summary: record.summary,
    params: configSchema.parse(record.paramsJson),
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function createConfigVersion(input: {
  summary: string;
  params: ConfigInput;
}) {
  const params = configSchema.parse(input.params);

  const created = await db.$transaction(async (tx) => {
    await tx.configVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return tx.configVersion.create({
      data: {
        summary: input.summary,
        paramsJson: params,
        isActive: true,
      },
    });
  });

  return mapConfigVersion(created);
}

export async function getActiveConfigVersion() {
  const active = await db.configVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return active ? mapConfigVersion(active) : null;
}
