import { deflateSync, inflateSync } from "zlib";

export async function fileCompressHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const mode = (config.mode as string) || "compress";
  const encoding = (config.encoding as "base64" | "hex") || "base64";

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

  if (mode === "compress") {
    const inputBuffer = Buffer.from(data, "utf-8");
    const compressed = deflateSync(inputBuffer);
    const result = compressed.toString(encoding);

    return {
      result,
      originalSize: inputBuffer.length,
      compressedSize: compressed.length,
    };
  } else if (mode === "decompress") {
    const inputBuffer = Buffer.from(data, encoding);
    const decompressed = inflateSync(inputBuffer);
    const result = decompressed.toString("utf-8");

    return {
      result,
      originalSize: inputBuffer.length,
      compressedSize: inputBuffer.length,
    };
  } else {
    throw new Error(`Invalid mode "${mode}". Must be "compress" or "decompress"`);
  }
}
