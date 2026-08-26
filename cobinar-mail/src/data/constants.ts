/**
 * Same <path d="..."> data as webmail/index.html's sidebar icons, rendered
 * here with react-native-svg instead of inline <svg>. Two-path icons (a
 * body + a stroke-only accent, e.g. the cart handle) list both strings;
 * render each as its own <Path>.
 */
export const FOLDER_ICON_PATHS: Record<string, { paths: string[]; filled: boolean }> = {
  inbox: {
    filled: true,
    paths: ['M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-4h3.5l1.5 2h4l1.5-2H19v4zm0-6H5V5h14v8z'],
  },
  purchases: {
    filled: false,
    paths: ['M4 4h2l1.6 9.6a2 2 0 002 1.7h7.6a2 2 0 002-1.6L20 7H6.4'],
  },
  bills: {
    filled: false,
    paths: ['M5 3h14v18H5zM8 8h8M8 12h8M8 16h5'], // rect handled separately, see Icon component
  },
  social: {
    filled: true,
    paths: [
      'M9 8a3.2 3.2 0 100-6.4A3.2 3.2 0 009 8z',
      'M17 9.5a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2z',
      'M3 20v-1.2C3 15.6 5.7 14 9 14s6 1.6 6 4.8V20H3z',
      'M15.2 14.3c2.6.3 4.8 1.8 4.8 4.5V20h-3.5',
    ],
  },
  updates: {
    filled: false,
    paths: ['M6 9a6 6 0 1112 0v4l1.5 3h-15L6 13V9z', 'M10 19a2 2 0 004 0'],
  },
  forums: {
    filled: true,
    paths: ['M4 5h13v9H9l-4 3.5V14H4z', 'M10 9h11v9h-3v3l-4-3h-4z'],
  },
  promotions: {
    filled: true,
    paths: ['M11 3H5a2 2 0 00-2 2v6a2 2 0 00.59 1.41l8 8a2 2 0 002.82 0l6-6a2 2 0 000-2.82l-8-8A2 2 0 0011 3z'],
  },
  starred: {
    filled: true,
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  },
  sent: {
    filled: true,
    paths: ['M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'],
  },
  drafts: {
    filled: true,
    paths: ['M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'],
  },
  all: {
    filled: true,
    paths: ['M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z'],
  },
  spam: {
    filled: false,
    paths: ['M6.5 6.5l11 11'], // circle handled separately, see Icon component
  },
  trash: {
    filled: true,
    paths: ['M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z'],
  },
  back: {
    filled: true,
    paths: ['M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'],
  },
  reply: {
    filled: true,
    paths: ['M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z'],
  },
  forward: {
    filled: true,
    paths: ['M12 8V4l8 8-8 8v-4c-5 0-8.5 1.6-11 5 1-5 4-10 11-11z'],
  },
  move: {
    filled: true,
    paths: ['M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z'],
  },
};

/** Same djb2-ish hash as avatarBg() in webmail/index.html — must stay
 *  identical so the same sender hashes to the same color on both clients. */
const AVATAR_COLOR_KEYS = ['', 'bg-blue', 'bg-green', 'bg-purple', 'bg-red'] as const;
export function avatarColorKey(from: string): (typeof AVATAR_COLOR_KEYS)[number] {
  let h = 0;
  for (let i = 0; i < from.length; i++) h = (h * 31 + from.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLOR_KEYS[Math.abs(h) % AVATAR_COLOR_KEYS.length];
}

export function extractName(from: string): string {
  const m = from.match(/^"?([^"<]+)"?\s*</);
  if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  return from.replace(/<[^>]+>/g, '').trim() || from;
}

export function extractEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}
