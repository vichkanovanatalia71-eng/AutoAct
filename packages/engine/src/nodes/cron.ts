export async function cronHandler(
  config: Record<string, unknown>,
  _input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const schedule = String(config.schedule ?? "");

  return {
    triggered: true,
    schedule,
  };
}
