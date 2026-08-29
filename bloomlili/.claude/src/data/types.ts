/**
 * These mirror worker/src/index.js's writeMailMessage() field-for-field.
 * If that schema changes, this is the other half that needs to change with it.
 */

export type SystemFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';

export type Category =
  | 'purchases' | 'bills' | 'social' | 'updates' | 'forums' | 'promotions'
  | ''; // '' = uncategorized / primary Inbox

// Virtual, UI-only destinations that aren't a literal `folder` value on a
// message — Starred and All Mail are computed filters, not stored fields.
export type ViewId =
  | 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'
  | 'starred' | 'all'
  | 'purchases' | 'bills' | 'social' | 'updates' | 'forums' | 'promotions';

export interface MailMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  folder: SystemFolder;
  category: Category;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  snippet: string;
  read: boolean;
  starred: boolean;
  messageId: string;
  status: 'sent' | 'failed' | 'received';
  avatarUrl: string;
  createdAt: number; // epoch millis, converted from Firestore Timestamp on read
  /**
   * True only for messages delivered via the Worker's internal cobinar-to-
   * cobinar fast path (writeMailMessage called directly by handleSendMail,
   * never touching the open SMTP graph). This is the one thing the app can
   * actually vouch for cryptographically — see VerifiedBadge.
   *
   * NOT present as a literal Firestore field; derived client-side as
   * (direction === 'inbound' && status === 'received' && it came from
   * another Cobinar mailbox, i.e. avatarUrl/category came through the
   * X-Cobinar-* headers on a message whose `from` resolves to a known
   * mailbox). See src/data/verification.ts for the exact rule and its
   * honest limits — it is a UI signal, not a security boundary.
   */
}

export interface Mailbox {
  address: string;
  displayName: string;
  picture: string;
}

export const FOLDER_LABELS: Record<string, string> = {
  inbox: 'Inbox', starred: 'Starred', sent: 'Sent', drafts: 'Drafts', trash: 'Trash',
  all: 'All Mail', spam: 'Spam',
  purchases: 'Purchases', bills: 'Bills', social: 'Social',
  updates: 'Updates', forums: 'Forums', promotions: 'Promotions',
};

export const CATEGORY_KEYS = ['purchases', 'bills', 'social', 'updates', 'forums', 'promotions'] as const;
