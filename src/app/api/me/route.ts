import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const email = session.user.email;
    if (!email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { name: session.user.name ?? null, email },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Failed to retrieve current user");
    return NextResponse.json(
      { error: "Unable to retrieve user" },
      { status: 500 },
    );
  }
};
