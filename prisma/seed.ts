import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  return url;
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: getDatabaseUrl(),
  }),
});

async function main() {
  const existing = await prisma.configVersion.findFirst({
    where: { isActive: true },
  });

  if (existing) {
    return;
  }

  await prisma.configVersion.create({
    data: {
      summary: "initial",
      isActive: true,
      paramsJson: {
        riskPct: 1,
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
