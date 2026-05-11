import type { Alarm, AlarmInput, Dataset, DatasetListItem, LoginInput, LoginResponse, User } from "../types";

// In dev, VITE_API_URL is unset → BASE is "/api" and Vite proxies it.
// In prod, VITE_API_URL is the public API origin (build-time) → BASE is "<origin>/api".
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const BASE = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";

const TOKEN_KEY = "palvi.token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    if (token) {
      // Session expired or token invalidated — clear and reload to login page
      clearToken();
      window.location.reload();
      throw new Error("API 401: session expired");
    }
    // No token was attached — surface 401 to caller (e.g. login form shows error)
    const text = await res.text();
    throw new Error(`API 401: ${text}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (payload: LoginInput) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request<User>("/auth/me"),
  listDatasets: () => request<DatasetListItem[]>("/datasets"),
  getDataset: (id: string) =>
    request<Dataset>(`/metrics?dataset=${encodeURIComponent(id)}`),
  listAlarms: (datasetId: string, to?: string) => {
    const q = new URLSearchParams({ dataset: datasetId });
    if (to) q.set("to", to);
    return request<Alarm[]>(`/alarms?${q.toString()}`);
  },
  createAlarm: (payload: AlarmInput) =>
    request<Alarm>("/alarms", { method: "POST", body: JSON.stringify(payload) }),
  updateAlarm: (id: number, payload: Partial<AlarmInput>) =>
    request<Alarm>(`/alarms/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAlarm: (id: number) => request<void>(`/alarms/${id}`, { method: "DELETE" }),
};
