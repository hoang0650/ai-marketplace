/**
 * Multi-tenant host helper.
 * Path-based stores (`/store/{slug}`) are primary.
 * Subdomain form `creator.marketplace.ai` can be detected here when DNS is wired.
 */
export function creatorSlugFromHost(hostname: string): string | null {
  const host = (hostname || '').toLowerCase().split(':')[0];
  if (!host || host === 'localhost' || host.endsWith('.localhost')) {
    return null;
  }
  // e.g. nova-labs.marketplace.ai → nova-labs
  const parts = host.split('.');
  if (parts.length >= 3 && parts.slice(-2).join('.') === 'marketplace.ai') {
    const sub = parts[0];
    if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
      return sub;
    }
  }
  return null;
}
