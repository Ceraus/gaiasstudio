export type ApiErrorKind = "timeout" | "network" | "auth" | "validation" | "server" | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, kind: ApiErrorKind, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError("The request timed out.", "timeout");
  }
  if (error instanceof TypeError) {
    return new ApiError("The network request failed.", "network", undefined, error);
  }
  if (error instanceof Error) {
    return new ApiError(error.message, "unknown", undefined, error);
  }
  return new ApiError("An unknown API error occurred.", "unknown", undefined, error);
}

export async function errorFromResponse(response: Response): Promise<ApiError> {
  const details = await readErrorBody(response);
  const message = getMessage(details) ?? response.statusText ?? "The API request failed.";
  if (response.status === 401 || response.status === 403) return new ApiError(message, "auth", response.status, details);
  if (response.status === 422) return new ApiError(message, "validation", response.status, details);
  if (response.status >= 500) return new ApiError(message, "server", response.status, details);
  return new ApiError(message, "unknown", response.status, details);
}

async function readErrorBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
  try {
    return await response.text();
  } catch {
    return undefined;
  }
}

function getMessage(details: unknown) {
  if (!details || typeof details !== "object") return undefined;
  if ("message" in details && typeof details.message === "string") return details.message;
  if ("error" in details && typeof details.error === "string") return details.error;
  return undefined;
}
