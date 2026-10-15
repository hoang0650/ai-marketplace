/** Client-generated Idempotency-Key for wallet checkout (server dedupes per buyer). */
export function newIdempotencyKey(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) return `chk-${c.randomUUID()}`;
  return `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
