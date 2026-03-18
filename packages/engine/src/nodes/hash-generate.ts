import { createHash } from "crypto";

export async function hashGenerateHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const algorithm = (config.algorithm as string) || "sha256";
  const validAlgorithms = ["sha256", "sha512", "md5"];

  if (!validAlgorithms.includes(algorithm)) {
    throw new Error(
      `Invalid algorithm "${algorithm}". Must be one of: ${validAlgorithms.join(", ")}`,
    );
  }

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

  const hash = createHash(algorithm).update(data, "utf-8").digest("hex");

  return { hash, algorithm };
}
