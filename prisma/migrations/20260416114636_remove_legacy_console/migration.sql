/*
  Warnings:

  - You are about to drop the `AttributedViewpoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConfigVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReplayJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RunSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tweet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AttributedViewpoint";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConfigVersion";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Job";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ReplayJob";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RunSnapshot";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Tweet";
PRAGMA foreign_keys=on;
