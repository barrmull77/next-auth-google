import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongo";
import { NextResponse } from "next/server";
import { getUserByEmail } from "@/data/users";

export const GET = async () => {
  const session = await auth();

  if (!session?.user) {
    return new NextResponse(`You are not authenticated!`, {
      status: 500,
    });
  }

  await dbConnect();
  try {
    const user = await getUserByEmail(session?.user?.email as string);
    return new NextResponse(JSON.stringify(user), {
      status: 200,
    });
  } catch (error: unknown) {
    console.error(error);
    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error && 'message' in error) {
      message = String((error as { message: unknown }).message);
    }
    return new NextResponse(message, {
      status: 500,
    });
  }
};
