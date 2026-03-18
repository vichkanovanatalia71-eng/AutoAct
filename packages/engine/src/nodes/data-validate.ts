export async function dataValidateHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const data = (config.data !== undefined && typeof config.data === "object"
    ? config.data
    : context) as Record<string, unknown>;

  const rules = config.rules as Array<Record<string, unknown>> | undefined;
  if (!rules || !Array.isArray(rules)) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  for (const rule of rules) {
    const field = rule.field as string;
    const type = rule.type as string;
    const value = rule.value;

    if (!field || !type) continue;

    const fieldValue = getNestedValue(data, field);

    switch (type) {
      case "required": {
        if (fieldValue === undefined || fieldValue === null || fieldValue === "") {
          errors.push(`Field "${field}" is required`);
        }
        break;
      }

      case "email": {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
          const emailStr = String(fieldValue);
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailStr)) {
            errors.push(`Field "${field}" must be a valid email address`);
          }
        }
        break;
      }

      case "number": {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
          if (typeof fieldValue !== "number" && isNaN(Number(fieldValue))) {
            errors.push(`Field "${field}" must be a number`);
          }
        }
        break;
      }

      case "min": {
        if (fieldValue !== undefined && fieldValue !== null) {
          const numValue = typeof fieldValue === "number" ? fieldValue : Number(fieldValue);
          const minValue = typeof value === "number" ? value : Number(value);
          if (!isNaN(numValue) && numValue < minValue) {
            errors.push(`Field "${field}" must be at least ${minValue}`);
          }
        }
        break;
      }

      case "max": {
        if (fieldValue !== undefined && fieldValue !== null) {
          const numValue = typeof fieldValue === "number" ? fieldValue : Number(fieldValue);
          const maxValue = typeof value === "number" ? value : Number(value);
          if (!isNaN(numValue) && numValue > maxValue) {
            errors.push(`Field "${field}" must be at most ${maxValue}`);
          }
        }
        break;
      }

      case "pattern": {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
          const patternStr = String(value);
          const regex = new RegExp(patternStr);
          if (!regex.test(String(fieldValue))) {
            errors.push(`Field "${field}" does not match pattern "${patternStr}"`);
          }
        }
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}
