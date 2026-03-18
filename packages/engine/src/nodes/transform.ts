import { substituteTemplateVars } from "../utils";

export async function transformHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const mapping = config.mapping as Record<string, string> | undefined;

  if (!mapping || typeof mapping !== "object") {
    return input;
  }

  const result: Record<string, unknown> = {};
  for (const [outputField, template] of Object.entries(mapping)) {
    if (typeof template === "string") {
      result[outputField] = substituteTemplateVars(template, context);
    } else {
      result[outputField] = template;
    }
  }

  return result;
}
