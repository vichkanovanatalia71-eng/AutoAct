const MAX_DELAY_MS = 30000;

export async function delayHandler(
  config: Record<string, unknown>,
  _input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const requestedMs = typeof config.ms === "number" ? config.ms : 0;
  const ms = Math.min(Math.max(0, requestedMs), MAX_DELAY_MS);

  await new Promise<void>((resolve) => setTimeout(resolve, ms));

  return { delayed: true, ms };
}
