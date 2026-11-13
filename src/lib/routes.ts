export const LOGIN = "/login";
export const ROOT = "/";

export const PUBLIC_ROUTES: readonly string[] = [
  "/login",
  "/register",
  "/api/register",
  "/api/me",
  "/api/users",
];

export function isPublicRoute(pathname: string): boolean {
  return pathname === ROOT || PUBLIC_ROUTES.includes(pathname);
}
