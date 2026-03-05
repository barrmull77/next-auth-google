import { auth } from "@/auth";

export const fetchClient = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const session = await auth();


  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      ...(session && { Authorization: `Bearer ${session.accessToken}` }),
    },
  });
};
