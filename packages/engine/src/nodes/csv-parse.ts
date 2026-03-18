import { substituteTemplateVars } from "../utils";

export async function csvParseHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  let data: string;
  if (typeof config.data === "string" && config.data.length > 0) {
    data = substituteTemplateVars(config.data, context);
  } else if (typeof config.field === "string") {
    const fieldValue = context[config.field];
    if (typeof fieldValue !== "string") {
      throw new Error(`Field "${config.field}" is not a string or does not exist in input`);
    }
    data = fieldValue;
  } else {
    throw new Error("Either config.data or config.field must be provided");
  }

  const delimiter = typeof config.delimiter === "string" ? config.delimiter : ",";
  const hasHeaders = config.hasHeaders !== false;

  const rows: string[][] = [];
  const lines = parseCsvLines(data, delimiter);

  for (const line of lines) {
    if (line.length === 0 || (line.length === 1 && line[0] === "")) continue;
    rows.push(line);
  }

  const headers = hasHeaders && rows.length > 0 ? rows[0] : [];
  const dataRows = hasHeaders && rows.length > 0 ? rows.slice(1) : rows;

  return {
    rows: dataRows,
    headers,
    rowCount: dataRows.length,
  };
}

function parseCsvLines(data: string, delimiter: string): string[][] {
  const results: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    const next = i + 1 < data.length ? data[i + 1] : "";

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(current);
        current = "";
      } else if (char === "\r" && next === "\n") {
        row.push(current);
        current = "";
        results.push(row);
        row = [];
        i++;
      } else if (char === "\n") {
        row.push(current);
        current = "";
        results.push(row);
        row = [];
      } else {
        current += char;
      }
    }
  }

  row.push(current);
  if (row.length > 0) {
    results.push(row);
  }

  return results;
}
