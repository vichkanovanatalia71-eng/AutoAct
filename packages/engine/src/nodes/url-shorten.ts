import { createHash } from "crypto";

export async function urlShortenHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  let url: string;
  if (typeof config.url === "string" && config.url.length > 0) {
    url = config.url;
  } else if (typeof config.field === "string") {
    const fieldValue = context[config.field];
    if (typeof fieldValue !== "string") {
      throw new Error(`Field "${config.field}" is not a string or does not exist in input`);
    }
    url = fieldValue;
  } else {
    throw new Error("config.url must be provided as a non-empty string");
  }

  // Generate a deterministic short code from the URL using SHA-256
  const hash = createHash("sha256").update(url).digest("base64url");
  const length = typeof config.length === "number" ? config.length : 8;
  const shortCode = hash.slice(0, length);

  return {
    shortCode,
    originalUrl: url,
  };
}
