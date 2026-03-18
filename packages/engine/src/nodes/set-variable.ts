import { substituteTemplateVars } from "../utils";

export async function setVariableHandler(
  config: Record<string, unknown>,
  input: unknown,
  credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const variables = config.variables as Record<string, string> | undefined;

  if (!variables || typeof variables !== "object") {
    return {};
  }

  // Build a context that includes both input and credentials for substitution
  const context: Record<string, unknown> = {};
  if (input && typeof input === "object") {
    Object.assign(context, input);
  }
  context.credentials = credentials;

  const result: Record<string, unknown> = {};
  for (const [key, template] of Object.entries(variables)) {
    if (typeof template === "string") {
      result[key] = substituteTemplateVars(template, context);
    } else {
      result[key] = template;
    }
  }

  return result;
}
