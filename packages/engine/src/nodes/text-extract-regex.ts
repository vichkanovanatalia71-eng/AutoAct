export async function textExtractRegexHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  let text: string;
  if (typeof config.text === "string") {
    text = config.text;
  } else if (typeof config.field === "string") {
    const fieldValue = context[config.field];
    if (typeof fieldValue !== "string") {
      throw new Error(`Field "${config.field}" is not a string or does not exist in input`);
    }
    text = fieldValue;
  } else {
    throw new Error("Either config.text or config.field must be provided");
  }

  const pattern = config.pattern as string | undefined;
  if (!pattern || typeof pattern !== "string") {
    throw new Error("config.pattern must be a non-empty regex string");
  }

  const flags = typeof config.flags === "string" ? config.flags : "g";
  const regex = new RegExp(pattern, flags);

  const matches: string[] = [];
  const groups: Record<string, string>[] = [];

  let match: RegExpExecArray | null;
  if (flags.includes("g")) {
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[0]);
      if (match.groups) {
        groups.push({ ...match.groups });
      } else {
        const groupObj: Record<string, string> = {};
        for (let i = 1; i < match.length; i++) {
          groupObj[`group${i}`] = match[i] ?? "";
        }
        if (Object.keys(groupObj).length > 0) {
          groups.push(groupObj);
        }
      }
    }
  } else {
    match = regex.exec(text);
    if (match) {
      matches.push(match[0]);
      if (match.groups) {
        groups.push({ ...match.groups });
      } else {
        const groupObj: Record<string, string> = {};
        for (let i = 1; i < match.length; i++) {
          groupObj[`group${i}`] = match[i] ?? "";
        }
        if (Object.keys(groupObj).length > 0) {
          groups.push(groupObj);
        }
      }
    }
  }

  return { matches, groups };
}
