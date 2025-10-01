import { authService } from "./auth";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  includeAuth = true
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (includeAuth && authService.isAuthenticated()) {
    Object.assign(headers, authService.getAuthHeader());
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}
