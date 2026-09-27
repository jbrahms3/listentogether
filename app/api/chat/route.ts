import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { addMessage, getAllMessages, getMessagesSince } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since");
  const messages = since ? await getMessagesSince(Number(since)) : await getAllMessages();
  return NextResponse.json({ messages, serverTime: Date.now() });
}

function displayNameFor(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string {
  if (user.fullName) return user.fullName;
  if (user.username) return user.username;
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (email) return email.split("@")[0];
  return "Listener";
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
    }

    const body = await req.json();
    const text = (body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
    }

    const message = await addMessage(displayNameFor(user), text);
    return NextResponse.json({ message });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Could not send message." },
      { status: 500 }
    );
  }
}
