import { NextResponse } from "next/server";
import {
  ConfigVersionNotFoundError,
  activateConfigVersion,
} from "@/modules/config/config-service";

type RouteContext = {
  params: Promise<{
    versionId: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { versionId } = await params;
    const version = await activateConfigVersion(versionId);

    return NextResponse.json({ version });
  } catch (error) {
    if (error instanceof ConfigVersionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
