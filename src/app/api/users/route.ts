import { NextResponse } from "next/server";

export const GET = async () => {
  return NextResponse.json(
    { error: "User listing is unavailable" },
    { status: 404 },
  );
};
