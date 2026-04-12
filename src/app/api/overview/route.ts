import { NextResponse } from "next/server";
import { getOverviewPayload } from "@/modules/overview/overview-service";

// 首页聚合接口：只负责把服务层计算好的首页数据返回给前端。
export async function GET() {
  // 路由层不做任何聚合，直接复用服务层的统一结果，避免逻辑分叉。
  const payload = await getOverviewPayload();

  return NextResponse.json(payload);
}
