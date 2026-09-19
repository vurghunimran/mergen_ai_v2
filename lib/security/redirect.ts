/** Never interpret an email-link return path as an external URL. */
export function safeVerificationPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/auth';
  try {
    const target = new URL(value, 'https://mergen.invalid');
    return target.origin === 'https://mergen.invalid' ? target.pathname + target.search + target.hash : '/auth';
  } catch { return '/auth'; }
}
