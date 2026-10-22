import { APP_REQUEST_HEADER, APP_REQUEST_VALUE } from "@/lib/constants";

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set(APP_REQUEST_HEADER, APP_REQUEST_VALUE);
  return fetch(input, { ...init, headers, credentials: "include" });
}
