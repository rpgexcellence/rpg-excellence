const ACCOUNTS = new Set(['r.pereszczako@sky.com', 'info@rpgexcellence.com']);

// Use the server-verified auth identity, never profile metadata or a client flag.
export function commercialAccess(user) {
  return Boolean(user?.id && user.email_confirmed_at && ACCOUNTS.has(String(user.email || '').trim().toLowerCase()));
}
