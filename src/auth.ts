import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { authenticateCredentials } from "@/lib/credentials";
import { resolveGoogleUser } from "@/lib/google";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authenticateCredentials,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google") {
        return account?.provider === "credentials";
      }
      const result = await resolveGoogleUser(
        profile,
        account.providerAccountId,
      );
      if ("error" in result) {
        console.warn("Google sign-in rejected", { reason: result.error });
        return `/login?error=${result.error}`;
      }
      // Auth.js passes this same user object to the initial JWT callback.
      user.id = result.user.id;
      user.name = result.user.name;
      user.email = result.user.email;
      return true;
    },
  },
});
