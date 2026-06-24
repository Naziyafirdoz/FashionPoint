export async function parseReportResponse<T>(res: Response): Promise<T> {
  const raw = await res.text();

  if (!res.ok) {
    let message = "Unable to load report";

    if (raw) {
      try {
        const errorJson = JSON.parse(raw) as { error?: string; success?: boolean };
        if (typeof errorJson.error === "string" && errorJson.error) {
          message = errorJson.error;
        }
      } catch {
        message = "Failed to load report";
      }
    }

    throw new Error(message);
  }

  if (!raw.trim()) {
    throw new Error("Empty response from server");
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from server");
  }

  if (json.success === false) {
    throw new Error(typeof json.error === "string" ? json.error : "Unable to load report");
  }

  if (json.success === true && "data" in json) {
    return json.data as T;
  }

  return json as T;
}
