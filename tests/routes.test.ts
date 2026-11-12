import { describe, expect, it } from "vitest";
import { isPublicRoute } from "@/lib/routes";

describe("public routes", () => {
  it.each(["/", "/login", "/register", "/api/register", "/api/me", "/api/users"])(
    "allows %s to reach its page or handler",
    (pathname) => expect(isPublicRoute(pathname)).toBe(true),
  );

  it.each(["/dashboard", "/products", "/products/1/checkout", "/login-extra", "/api/private"])(
    "does not mark %s as public",
    (pathname) => expect(isPublicRoute(pathname)).toBe(false),
  );
});
