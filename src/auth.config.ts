import type { Provider } from "next-auth/providers/index";

export interface AuthConfig {
  session: {
    strategy: "jwt" | "database";
    maxAge: number;
  };
  providers: Provider[];
}

export const authConfig: AuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 Day
  },
  providers: [],
};
