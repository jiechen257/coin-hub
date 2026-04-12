import { NextResponse } from "next/server";
import {
  getConfigVersionData,
  saveNewConfigVersion,
} from "@/modules/config/config-service";
import { ZodError } from "zod";

export async function GET() {
  const data = await getConfigVersionData();

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      summary?: unknown;
      params?: unknown;
    };

    if (typeof body.summary !== "string") {
      return NextResponse.json({ error: "摘要不能为空" }, { status: 400 });
    }

    const version = await saveNewConfigVersion({
      summary: body.summary,
      params: body.params,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "配置参数不符合校验规则" },
        { status: 400 },
      );
    }

    throw error;
  }
}
