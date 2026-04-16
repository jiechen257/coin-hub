import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const traders = await db.traderProfile.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ traders });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    platform?: string;
    notes?: string;
  };
  const trader = await db.traderProfile.create({ data: body });
  return NextResponse.json({ trader }, { status: 201 });
}
