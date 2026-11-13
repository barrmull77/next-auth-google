import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";
import type { JWT } from "@auth/core/jwt";
import type { AdapterUser } from "@auth/core/adapters";
import type { Account, User, Session } from "next-auth";
import { authConfig } from "./auth.config";

// Extend NextAuth Session type to include accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

interface Token {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
  [key: string]: unknown;
}

async function refreshAccessToken(token: Token): Promise<Token> {
  try {
    const response = await fetch(
      `${process.env.API_SERVER_BASE_URL}/api/auth/refresh`,
      {
        headers: {
          Authorization: `Bearer ${token.refreshToken}`,
        },
      },
    );

    const tokens = await response.json();

    if (!response.ok) {
      throw tokens;
    }
    return {
      ...token,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? token.refreshToken,
    };
  } catch (error) {
    console.log(error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

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
      async authorize(credentials: Record<string, unknown> | null) {
        if (!credentials) return null;
        const { getUserByEmail } = await import("@/data/users");
        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await getUserByEmail(email);
        if (!user) return null;

        const { users } = await import("./data/users");

        const originalUser = users.find((u) => u.email === email);
        if (!originalUser || originalUser.password !== password) return null;

        return {
          id: email,
          email: user.email,
          name: user.name,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    jwt: async ({
      token,
      account,
      user,
    }: {
      token: JWT;
      user?: User | AdapterUser;
      account?: Account | null;
    }) => {
      // Handle dummy users (no accessToken/refreshToken)
      if (user && account?.provider === "credentials") {
        return {
          ...token,
          authProvider: "credentials",
          user,
        };
      }
      if (token.authProvider === "credentials") {
        return token;
      }
      // Handle OAuth users (Google)
      if (token.accessToken) {
        type JwtPayload = { exp?: number };
        const decodedToken: JwtPayload = jwtDecode<JwtPayload>(
          token.accessToken as string,
        );
        token.accessTokenExpires = decodedToken?.exp
          ? decodedToken.exp * 1000
          : undefined;
      }
      if (account && user) {
        return {
          ...token,
          accessToken:
            typeof user === "object" && user && "accessToken" in user
              ? (user as { accessToken?: string }).accessToken
              : undefined,
          refreshToken:
            typeof user === "object" && user && "refreshToken" in user
              ? (user as { refreshToken?: string }).refreshToken
              : undefined,
          user,
        };
      }
      if (
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires
      ) {
        return token;
      }
      return refreshAccessToken(token as Token);
    },
    session: async ({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
      user?: User | AdapterUser;
      newSession?: unknown;
      trigger?: "update";
    }) => {
      // Always populate session.user for credentials/dummy users
      if (token && token.user) {
        session.user = token.user;
      }
      if ("accessToken" in token) {
        (session as Session & { accessToken?: string }).accessToken = (
          token as JWT & { accessToken?: string }
        ).accessToken;
      }

      return session;
    },
  },
});
