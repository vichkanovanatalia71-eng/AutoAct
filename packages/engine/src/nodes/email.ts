export async function emailHandler(
  config: Record<string, unknown>,
  _input: unknown,
  _credentials: Record<string, Record<string, string>>,
): Promise<unknown> {
  const to = String(config.to ?? "");
  const subject = String(config.subject ?? "");
  const body = String(config.body ?? "");

  // STUB: log email intent without actually sending
  console.log(`[email stub] to=${to} subject=${subject} body=${body}`);

  return {
    sent: false,
    stub: true,
    to,
    subject,
  };
}
