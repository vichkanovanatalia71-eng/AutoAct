import { substituteTemplateVars } from "../utils";

export async function htmlTemplateHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const template = config.template as string | undefined;
  if (!template || typeof template !== "string") {
    throw new Error("config.template must be a non-empty string");
  }

  const html = substituteTemplateVars(template, context);

  return { html };
}
