# Cobinar Mail — Mobile (Expo)

Same Firebase project and same Worker API as `webmail/` — this is a second
client for one mailbox system, not a separate backend. Signing in on
mobile and web gives you the same inbox.

## Setup

```bash
cd cobinar-mail-mobile
npx expo install --fix   # aligns every dependency to whatever the current
                          # Expo SDK actually is — the versions in
                          # package.json are a reasonable recent baseline,
                          # not guaranteed to be THE current release
npm run typecheck        # tsc --noEmit
```

Three placeholders need real values before this runs against your own
accounts — search for them by name:

| Placeholder | Where | How to get it |
|---|---|---|
| `REPLACE_WITH_EAS_PROJECT_ID` | `app.json` (×2) | `eas init` |
| `REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID` | `src/auth/useGoogleAuth.ts` | Google Cloud Console → Credentials, for the `cobinar-mail` Firebase project. You need platform-specific OAuth client IDs (iOS/Android), not the Firebase web client ID — and each one needs `cobinarmail://auth-callback` registered as a redirect URI. |
| `GROQ_API_KEY` | *(not in this app — it's a Worker secret)* | Only relevant if AI Compose isn't already working against your deployed Worker. |

Then:

```bash
eas update:configure
eas build --profile development   # first real device/simulator build
eas update --branch development   # ship a JS-only change over the air
```

## What I could actually verify, and what I couldn't

I don't have a simulator, emulator, or the real `expo`/`react-native`/
`firebase` packages available in the environment I built this in (no
network access to install them). So, unlike `worker/src/index.js` — which
I ran, and unit-tested against mocked dependencies — I could not run this
app or type-check it against real type definitions.

What I *did* verify:
- Every file parses as valid TypeScript (checked with the TypeScript
  compiler's parser directly against all 29 source files — zero errors).
- Every `@/...` import resolves to a real file in this project.
- The data model (`src/data/types.ts`), Firestore paths, filtering rules,
  and API contracts are copied directly from the same worker/webmail code
  that's already deployed and tested — not re-derived from scratch.

What that means practically: run `npx expo install --fix && npm run
typecheck` as your first step. That's very likely to surface anything
version- or type-related that I couldn't catch from here.

## Security — what's actually true, specifically

Both "encryption" and "impersonation protection" are broad asks, so here's
exactly what was built for each, and — just as importantly — what wasn't.

**Session storage is hardware-encrypted, not just moved.**
`src/security/secureAsyncStorage.ts` backs Firebase Auth's persistence
with `expo-secure-store` (iOS Keychain / Android Keystore) instead of
plain AsyncStorage, which is unencrypted on both platforms. The adapter
chunks values across multiple keys because SecureStore caps individual
items at roughly 2KB and Firebase's persisted session routinely exceeds
that — a detail that breaks a lot of naive "just swap in SecureStore"
implementations. Chunked writes are ordered so an interrupted write can
never leave a corrupted partial session; the worst case is falling back
to a fresh sign-in.

**The mobile OAuth flow uses real PKCE, with one caveat.**
`src/auth/useCobinarAuth.ts` uses `expo-auth-session`'s Authorization Code
flow, which generates and manages a PKCE code_verifier/code_challenge
automatically. This matters more on mobile than web: a custom URL scheme
like `cobinarmail://` isn't exclusively ours the way an `https://` origin
is, so PKCE is what makes an intercepted authorization code useless
without the verifier. The Worker (`handleCobinarToken`) now forwards
`code_verifier` to `auth.cobinar.com`'s token endpoint — but whether it's
actually *enforced* depends on that OAuth server supporting PKCE, which is
outside this codebase. Worth confirming with whoever operates it.

**A "Verified sender" badge exists, and it's honestly scoped.**
Messages delivered through the Worker's cobinar-to-cobinar fast path (see
`deliverInternally` in `handleSendMail`) are now tagged `verified: true`
in Firestore — added specifically for this. That's a real, meaningful
signal: it means the sender was a Firebase-authenticated mailbox holder at
send time, not just a claimed `From` header. It is *not* shown for regular
inbound mail, which has no cryptographic backing at all — same as real
email generally, absent your own SPF/DKIM/DMARC setup. The badge tells you
"this came from inside Cobinar," not "this content is trustworthy."

**HTTPS + host allowlisting is real; certificate pinning is not (yet).**
`src/security/pinnedFetch.ts` rejects non-HTTPS URLs and anything outside
an explicit host allowlist before a request is even made. True certificate
pinning — rejecting a *valid* certificate that isn't the one you expect,
which is what actually stops a compromised-CA MITM — needs a native
module and real certificate fingerprints, neither of which I could
responsibly fake from here (a wrong pin bricks connectivity, not
security). The file documents exactly how to add it for real; I didn't
want to ship a `PINS` object with placeholder-shaped values that look
enforced but aren't.

**Email body HTML renders with JavaScript disabled.**
The message detail screen uses a WebView with `javaScriptEnabled={false}`
for the actual email content, since that content can come from anyone,
verified or not. The tradeoff: without script, the WebView can't report
its own content height back to the app, so `estimateBodyHeight()` is a
rough heuristic rather than an exact measurement.

**What's explicitly NOT built: end-to-end content encryption.**
Email bodies are stored in Firestore and transmitted exactly the way they
are in the web app — readable server-side, same as effectively all email
everywhere outside of specialized PGP/S-MIME setups. Real E2E encryption
(per-user key generation, secure key storage and exchange, encrypting
before send, decrypting after receive, and an honest answer for what
happens when the recipient is a plain external email address that can't
participate) is its own large project, not something that layers cleanly
onto the send/receive model this app already has. Building a partial or
cosmetic version of that would be worse than not claiming it at all.

## Known simplifications vs. the web app

- **Compose is plain text, not the rich HTML editor.** Building a real
  formatting toolbar (bold/italic/lists/links) for React Native text input
  is a substantial project on its own — the mobile compose screen sends
  what you type wrapped in a single `<p>`, and AI Compose output is
  flattened from HTML back to plain text for editing. Reply/forward
  quoting works the same as web, just as plain text.
- **The drawer is custom-built** (`src/navigation/DrawerContext.tsx` +
  the animated overlay in `app/(app)/_layout.tsx`), not React Navigation's
  Drawer component — this kept the exact neobrutalist border/shadow
  language intact rather than fighting a pre-styled navigator, at the
  cost of not getting swipe-from-edge-to-open for free. Easy to add later
  with `react-native-gesture-handler`'s pan gesture if you want it.
