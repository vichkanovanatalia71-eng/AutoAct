export async function dateFormatHandler(
  config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const context = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  let date: Date;
  if (typeof config.date === "string" && config.date.length > 0) {
    date = new Date(config.date);
  } else if (typeof config.date === "number") {
    date = new Date(config.date);
  } else if (typeof config.field === "string" && context[config.field]) {
    date = new Date(context[config.field] as string | number);
  } else {
    date = new Date();
  }

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date provided");
  }

  const timezone = (config.timezone as string) || "UTC";
  const locale = (config.locale as string) || "en-US";
  const format = (config.format as string) || undefined;

  let formatted: string;

  if (format) {
    formatted = formatCustom(date, format, timezone, locale);
  } else {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    formatted = formatter.format(date);
  }

  return {
    formatted,
    timestamp: date.getTime(),
    iso: date.toISOString(),
  };
}

function formatCustom(date: Date, format: string, timezone: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "long",
  }).formatToParts(date);

  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  return format
    .replace("YYYY", partMap.year || "")
    .replace("YY", (partMap.year || "").slice(-2))
    .replace("MM", partMap.month || "")
    .replace("DD", partMap.day || "")
    .replace("HH", partMap.hour || "")
    .replace("mm", partMap.minute || "")
    .replace("ss", partMap.second || "")
    .replace("dddd", partMap.weekday || "");
}
