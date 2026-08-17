// src/lib/katanaClient.ts


export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||"http://localhost:3000/api";
const AUTH_TOKEN_STORAGE_KEY = "auth_token";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export interface KatanaErrorDetail {
  path?: string;
  code?: string;
  message?: string;
  info?: Record<string, unknown>;
}

export interface KatanaErrorPayload {
  error?: {
    statusCode?: number;
    name?: string;
    message?: string;
    code?: string;
    details?: KatanaErrorDetail[];
  };
}

export type KatanaResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      message: string;
      statusCode?: number;
      details?: KatanaErrorDetail[];
    };

export const katanaFetch = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<KatanaResponse<T>> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: "Not authenticated",
        statusCode: 401,
      };
    }

    const cleanBase = BACKEND_URL.replace(/\/+$/, ""); // Strip trailing slashes
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${cleanBase}${cleanEndpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      console.error("Katana API returned 401 Unauthorized. Check your API key.");
      return { success: false, message: "Unauthorized API Request", statusCode: 401 };
    }

    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;
      let errorDetails: KatanaErrorDetail[] | undefined;

      try {
        const errorJson = (await res.json()) as KatanaErrorPayload;

        if (errorJson?.error) {
          if (errorJson.error.details && errorJson.error.details.length > 0) {
            const formattedDetails = errorJson.error.details
              .map((d) => `${d.path ? `${d.path}: ` : ""}${d.message}`)
              .join(" | ");
            errorMessage = `${errorJson.error.message || "Validation Error"} (${formattedDetails})`;
            errorDetails = errorJson.error.details;
          } else if (errorJson.error.message) {
            errorMessage = errorJson.error.message;
          }
        }
      } catch {
        const rawText = await res.text().catch(() => "");
        if (rawText) errorMessage = rawText;
      }

      console.error(`Katana API Error [${res.status}]:`, errorMessage);

      return {
        success: false,
        message: errorMessage,
        statusCode: res.status,
        details: errorDetails,
      };
    }

    if (res.status === 204) {
      return { success: true, data: {} as T };
    }

    const rawJson = await res.json();

    const payload =
      rawJson && typeof rawJson === "object" && "data" in rawJson
        ? rawJson.data
        : rawJson;

    return { success: true, data: payload as T };
  } catch (err) {
    console.error("Network or unexpected fetch error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected network error occurred";
    return { success: false, message };
  }
};