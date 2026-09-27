import { NextResponse } from "next/server";
import { skipCurrent } from "@/lib/store";

export async function POST() {
  await skipCurrent();
  return NextResponse.json({ ok: true });
}
