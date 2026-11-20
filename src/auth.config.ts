import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 Day
  },
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt: async ({ token, account, user }) => {
      if (account && user) {
        if (
          !user.id ||
          !user.name ||
          !user.email ||
          !["credentials", "google"].includes(account.provider)
        ) {
          throw new Error("Missing application identity");
        }
        return {
          sub: user.id,
          name: user.name,
          email: user.email,
          picture: user.image,
          authProvider: account.provider,
        };
      }
      if (
        token.sub &&
        (token.authProvider === "credentials" ||
          token.authProvider === "google")
      ) {
        return {
          sub: token.sub,
          name: token.name,
          email: token.email,
          picture: token.picture,
          authProvider: token.authProvider,
        };
      }
      // Old Google sessions have no persisted identity; require a fresh sign-in.
      return null;
    },
    session: async ({ session, token }) => ({
      expires: session.expires,
      user: {
        id: token.sub,
        name: token.name,
        email: token.email,
        image: token.picture,
      },
    }),
  },
} satisfies NextAuthConfig;
