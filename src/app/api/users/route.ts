import { NextResponse } from "next/server";
import { users } from "@/data/users";

export const GET = async () => {
  // Return users with _id property for frontend compatibility
  const usersWithId = users.map((user) => ({
    _id: user.email, // Use email as unique id
    email: user.email,
    role: user.role || "user",
  }));
  return NextResponse.json(usersWithId);
};
