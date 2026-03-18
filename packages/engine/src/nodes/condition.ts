import { substituteTemplateVars } from "../utils";

export async function conditionHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const expression = substituteTemplateVars(String(config.expression ?? "false"), context);

  let result = false;

  // Evaluate simple comparison expressions: "value1 === value2", "value1 !== value2", etc.
  const tripleEqMatch = expression.match(/^(.+?)\s*===\s*(.+)$/);
  const tripleNeqMatch = expression.match(/^(.+?)\s*!==\s*(.+)$/);
  const gtMatch = expression.match(/^(.+?)\s*>\s*(.+)$/);
  const ltMatch = expression.match(/^(.+?)\s*<\s*(.+)$/);
  const gteMatch = expression.match(/^(.+?)\s*>=\s*(.+)$/);
  const lteMatch = expression.match(/^(.+?)\s*<=\s*(.+)$/);

  if (tripleEqMatch) {
    result = tripleEqMatch[1].trim() === tripleEqMatch[2].trim();
  } else if (tripleNeqMatch) {
    result = tripleNeqMatch[1].trim() !== tripleNeqMatch[2].trim();
  } else if (gteMatch) {
    result = Number(gteMatch[1].trim()) >= Number(gteMatch[2].trim());
  } else if (lteMatch) {
    result = Number(lteMatch[1].trim()) <= Number(lteMatch[2].trim());
  } else if (gtMatch) {
    result = Number(gtMatch[1].trim()) > Number(gtMatch[2].trim());
  } else if (ltMatch) {
    result = Number(ltMatch[1].trim()) < Number(ltMatch[2].trim());
  } else {
    // Truthy check: non-empty, non-"false", non-"0" strings are truthy
    const trimmed = expression.trim();
    result = trimmed !== "" && trimmed !== "false" && trimmed !== "0" && trimmed !== "undefined" && trimmed !== "null";
  }

  return { result };
}
