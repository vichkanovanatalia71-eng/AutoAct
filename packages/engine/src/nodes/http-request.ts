import { substituteTemplateVars } from "../utils";

export async function httpRequestHandler(
  config: Record<string, unknown>,
  input: unknown,
  credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  let url = substituteTemplateVars(String(config.url ?? ""), context);
  const method = String(config.method ?? "GET").toUpperCase();

  const headers: Record<string, string> = {};
  if (config.headers && typeof config.headers === "object") {
    for (const [key, val] of Object.entries(config.headers as Record<string, string>)) {
      headers[key] = substituteTemplateVars(String(val), context);
    }
  }

  // Inject credentials if auth_ref is provided
  const authRef = config.auth_ref as string | undefined;
  if (authRef && credentials[authRef]) {
    const cred = credentials[authRef];
    if (cred.token) {
      headers["Authorization"] = `Bearer ${cred.token}`;
    } else if (cred.api_key) {
      headers["Authorization"] = `Bearer ${cred.api_key}`;
    }
  }

  let body: string | undefined;
  if (config.body !== undefined && method !== "GET" && method !== "HEAD") {
    body =
      typeof config.body === "string"
        ? substituteTemplateVars(config.body, context)
        : JSON.stringify(config.body);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") ?? "";
  let responseBody: unknown;
  if (contentType.includes("application/json")) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    status: response.status,
    headers: responseHeaders,
    body: responseBody,
  };
}
