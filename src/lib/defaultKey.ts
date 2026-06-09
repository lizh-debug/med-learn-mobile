// Obfuscated default API key — prevents casual grep/skimming of the JS bundle.
// NOT cryptographically secure (client-side can never be), but classmates
// casually viewing source won't find the plaintext key.
// For real security, deploy the Cloudflare Worker in ../proxy/ instead.

export function getDefaultKey(): string {
  try {
    let k = atob('c2stMThlMTYxN2FkMDA3NDcwMmEyMjM2ZDkxNDgyYjY3YjI=');
    // Second pass — the stored string is also split
    if (k.length > 10) return k;
  } catch { /* ignore */ }
  return '';
}
