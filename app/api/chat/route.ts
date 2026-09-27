import { NextRequest, NextResponse } from "next/server";
import { addMessage, getAllMessages, getMessagesSince } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since");
  const messages = since ? getMessagesSince(Number(since)) : getAllMessages();
  return NextResponse.json({ messages, serverTime: Date.now() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body?.name ?? "").trim();
    const text = (body?.text ?? "").trim();
    if (!name || !text) {
      return NextResponse.json({ error: "Missing name or text" }, { status: 400 });
    }
    const message = addMessage(name, text);
    return NextResponse.json({ message });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Could not send message." },
      { status: 500 }
    );
  }
}
