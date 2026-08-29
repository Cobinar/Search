/**
 * webmail/index.html keeps this as a plain top-level `let cobinarUser`
 * variable set once at sign-in and read later by loadMailbox(). This is
 * the same pattern, just as an exported module — no need for a full state
 * library over one object that's written once per session and read once.
 */
export interface CobinarUserProfile {
  name?: string;
  picture?: string;
  address?: string;
  email?: string;
}

let current: CobinarUserProfile | null = null;

export function setCobinarUser(user: CobinarUserProfile | null): void {
  current = user;
}

export function getCobinarUser(): CobinarUserProfile | null {
  return current;
}
