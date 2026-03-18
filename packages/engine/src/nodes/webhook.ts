export async function webhookHandler(
  _config: Record<string, unknown>,
  input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  // Trigger node — passes through the incoming payload as-is
  return input;
}
