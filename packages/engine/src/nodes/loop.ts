import { substituteTemplateVars } from "../utils";

export async function loopHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const itemsPath = String(config.items_path ?? "");
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  // Resolve items array from input using dot-path
  let items: unknown[] = [];
  if (itemsPath) {
    const parts = itemsPath.split(".");
    let value: unknown = context;
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }
    if (Array.isArray(value)) {
      items = value;
    }
  }

  const subNodes = config.sub_nodes as Array<Record<string, unknown>> | undefined;
  const results: unknown[] = [];

  for (const item of items) {
    let current: unknown = item;

    if (subNodes && Array.isArray(subNodes)) {
      for (const subNode of subNodes) {
        const mapping = subNode.mapping as Record<string, string> | undefined;
        if (mapping && typeof mapping === "object") {
          const itemContext = current && typeof current === "object" ? (current as Record<string, unknown>) : { value: current };
          const transformed: Record<string, unknown> = {};
          for (const [outputField, template] of Object.entries(mapping)) {
            if (typeof template === "string") {
              transformed[outputField] = substituteTemplateVars(template, itemContext);
            } else {
              transformed[outputField] = template;
            }
          }
          current = transformed;
        }
      }
    }

    results.push(current);
  }

  return { results };
}
