/**
 * Wraps fetch() for calls this app makes directly (the Worker API only —
 * Firebase's own SDK manages its own connections to Google's endpoints
 * separately and isn't routed through this).
 *
 * What this actually enforces, in plain JS, right now:
 *   1. HTTPS only — an http:// URL (or a URL missing a scheme entirely)
 *      is rejected before any request is made, so a typo or a stripped
 *      redirect can't silently downgrade a request to plaintext.
 *   2. Host allowlist — only EXPECTED_HOSTS may be contacted through this
 *      client. If something in the app ever tries to fetch a different
 *      host (a bug, a compromised dependency, a malicious redirect target),
 *      this throws instead of silently sending credentials somewhere else.
 *
 * What this does NOT do, and cannot do in pure JavaScript:
 *   True certificate / public-key pinning, which validates the server's
 *   TLS certificate against a hardcoded fingerprint and would stop a
 *   man-in-the-middle presenting a *valid* certificate for the domain
 *   (e.g. one issued by a compromised or coerced CA). That requires
 *   intercepting the TLS handshake at the native layer, which means a
 *   native module (e.g. react-native-ssl-pinning) or custom native code
 *   via a config plugin — either way, a custom dev client / EAS Build,
 *   not something a JS-only file can add.
 *
 * PINS below is left empty on purpose rather than filled with placeholder
 * values that would look real but do nothing. If you add real pinning:
 *   1. Get the SPKI SHA-256 hash of api.mail.cobinar.com's current cert
 *      (and its issuing CA, as a backup pin — pinning only the leaf cert
 *      means every renewal breaks the app until it's updated):
 *        openssl s_client -connect api.mail.cobinar.com:443 </dev/null 2>/dev/null \
 *          | openssl x509 -pubkey -noout \
 *          | openssl pkey -pubin -outform der \
 *          | openssl dgst -sha256 -binary | base64
 *   2. Add a native pinning library and wire PINS into it.
 *   3. Keep a rotation plan — an expired pin with no fallback bricks the
 *      app's connectivity until you ship an update.
 */

const EXPECTED_HOSTS = ['api.mail.cobinar.com'] as const;

// Intentionally empty — see the note above. Shape documented for whichever
// native pinning library gets wired in later.
const PINS: Record<string, string[]> = {
  // 'api.mail.cobinar.com': ['sha256/AAAA...', 'sha256/BBBB...' /* backup */],
};

export class UnexpectedHostError extends Error {
  constructor(host: string) {
    super(`Refusing to call unexpected host "${host}" — not in EXPECTED_HOSTS.`);
    this.name = 'UnexpectedHostError';
  }
}

function assertSafeUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== 'https:') {
    throw new Error(`Refusing a non-HTTPS request to ${url.protocol}//${url.host}`);
  }
  if (!EXPECTED_HOSTS.includes(url.hostname as (typeof EXPECTED_HOSTS)[number])) {
    throw new UnexpectedHostError(url.hostname);
  }
  return url;
}

export async function pinnedFetch(input: string, init?: RequestInit): Promise<Response> {
  assertSafeUrl(input);
  if (PINS[new URL(input).hostname]?.length) {
    // See class docstring: enforcement point for a native pinning library,
    // once one is wired in. Not reachable today since PINS is empty.
    console.warn('pinnedFetch: PINS configured but no native enforcement is wired in yet.');
  }
  return fetch(input, init);
}
