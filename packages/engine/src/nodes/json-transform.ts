export async function jsonTransformHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const sourceData = (config.data !== undefined ? config.data : context) as Record<string, unknown>;
  let result: Record<string, unknown> =
    sourceData && typeof sourceData === "object" && !Array.isArray(sourceData)
      ? { ...sourceData }
      : { ...(typeof sourceData === "object" ? sourceData : {}) };

  const operations = config.operations as Array<Record<string, unknown>> | undefined;
  if (!operations || !Array.isArray(operations)) {
    return result;
  }

  for (const op of operations) {
    const type = op.type as string;

    switch (type) {
      case "pick": {
        const fields = op.fields as string[];
        if (Array.isArray(fields)) {
          const picked: Record<string, unknown> = {};
          for (const field of fields) {
            if (field in result) {
              picked[field] = result[field];
            }
          }
          result = picked;
        }
        break;
      }

      case "omit": {
        const fields = op.fields as string[];
        if (Array.isArray(fields)) {
          const omitted: Record<string, unknown> = { ...result };
          for (const field of fields) {
            delete omitted[field];
          }
          result = omitted;
        }
        break;
      }

      case "rename": {
        const mapping = op.mapping as Record<string, string>;
        if (mapping && typeof mapping === "object") {
          const renamed: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(result)) {
            const newKey = mapping[key] || key;
            renamed[newKey] = value;
          }
          result = renamed;
        }
        break;
      }

      case "flatten": {
        const prefix = (op.prefix as string) || "";
        const separator = (op.separator as string) || ".";
        result = flattenObject(result, prefix, separator);
        break;
      }
    }
  }

  return result;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix: string,
  separator: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = flattenObject(value as Record<string, unknown>, newKey, separator);
      Object.assign(result, nested);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}
