import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getUserByEmail } from "@/data/users";

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

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { name: user.name, email: user.email },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Failed to retrieve current user");
    return NextResponse.json({ error: "Unable to retrieve user" }, { status: 500 });
  }
};
