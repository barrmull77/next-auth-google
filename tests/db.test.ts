import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { Pool } = vi.hoisted(() => ({
  Pool: vi.fn(
    class {
      on = vi.fn();
    },
  ),
}));
vi.mock("pg", () => ({ Pool }));
vi.mock("server-only", () => ({}));

import { getDatabasePool } from "@/lib/db";

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost/test");
  Reflect.deleteProperty(globalThis, "appDatabasePool");
});

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(globalThis, "appDatabasePool");
});

it("reuses a bounded pool for server requests", () => {
  expect(getDatabasePool()).toBe(getDatabasePool());
  expect(Pool).toHaveBeenCalledTimes(1);
  expect(Pool).toHaveBeenCalledWith({
    connectionString: "postgresql://test:test@localhost/test",
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
});

it("rejects a missing connection URL", () => {
  vi.stubEnv("DATABASE_URL", "");
  expect(() => getDatabasePool()).toThrow("DATABASE_URL must be configured");
  expect(Pool).not.toHaveBeenCalled();
});
