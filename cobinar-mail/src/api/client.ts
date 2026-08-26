import { auth } from '@/config/firebase';
import { pinnedFetch } from '@/security/pinnedFetch';

const API = 'https://api.mail.cobinar.com';

class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError('Not signed in.', 401);

  // Firebase ID tokens are short-lived (~1hr) and getIdToken() transparently
  // refreshes them — never store or reuse a raw token across requests.
  const idToken = await user.getIdToken();

  const res = await pinnedFetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new ApiError(data.error?.message || 'Request failed.', res.status, data.error?.code);
  }
  return data as T;
}

export interface SendMailResult {
  success: true;
  message_id: string;
  status: string;
  from: string;
  delivery: 'internal' | 'external';
}

export function sendMail(params: { to: string; subject: string; html?: string; text?: string }) {
  return authedPost<SendMailResult>('/internal/send-mail', params);
}

export interface AiComposeResult {
  success: true;
  subject: string;
  html: string;
}

export type AiTone = 'professional' | 'friendly' | 'formal' | 'casual' | 'persuasive';

export function aiCompose(params: { topic: string; tone?: AiTone }) {
  return authedPost<AiComposeResult>('/internal/ai-compose', params);
}

export { ApiError };
