import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 健康检查只验证最小可用性：Prisma 能否连到数据库。
    await db.job.count();

    return NextResponse.json({
      status: "ok",
      checks: {
        database: "ok",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        checks: {
          database: "down",
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 503 },
    );
  }
}
