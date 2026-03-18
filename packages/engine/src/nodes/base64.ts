export async function base64Handler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const mode = (config.mode as string) || "encode";
  let data: string;

  if (typeof config.data === "string") {
    data = config.data;
  } else if (typeof config.field === "string") {
    const fieldValue = context[config.field];
    if (typeof fieldValue !== "string") {
      throw new Error(`Field "${config.field}" is not a string or does not exist in input`);
    }
    data = fieldValue;
  } else {
    throw new Error("config.data must be provided as a string");
  }

  let result: string;

  if (mode === "encode") {
    result = Buffer.from(data, "utf-8").toString("base64");
  } else if (mode === "decode") {
    result = Buffer.from(data, "base64").toString("utf-8");
  } else {
    throw new Error(`Invalid mode "${mode}". Must be "encode" or "decode"`);
  }

  return { result };
}
