import { NextResponse } from "next/server";
// NOTE: In a future version, this will be integrated with MongoDB for persistent user storage.
import bcrypt from "bcryptjs";


// Mock in-memory user store for demonstration only
const users: Array<{ name: string; email: string; password: string }> = [];

export const POST = async (request: Request) => {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return new NextResponse("Missing required fields", { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 5);
    // Store the user in the mock array 
    // Todo - replace with DB implementation in future
    users.push({ name, email, password: hashedPassword });
    return new NextResponse("User has been created", { status: 201 });
  } catch (error: unknown) {
    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error && 'message' in error) {
      message = String((error as { message: unknown }).message);
    }
    return new NextResponse(message, { status: 500 });
  }
};
