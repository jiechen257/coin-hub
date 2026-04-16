import "dotenv/config";

import { defineConfig } from "prisma/config";
import { resolvePrismaCliDatabaseUrl } from "./src/lib/database-runtime";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolvePrismaCliDatabaseUrl(process.env),
  },
});
