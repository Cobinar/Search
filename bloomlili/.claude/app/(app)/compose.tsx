import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthUser } from '@/auth/useAuthUser';
import { useMailbox } from '@/data/useMailbox';
import { useMessages } from '@/data/useMessages';
import { sendMail, aiCompose, type AiTone } from '@/api/client';
import { extractName, extractEmail } from '@/data/constants';
import { colors } from '@/theme/tokens';

const TONES: AiTone[] = ['professional', 'friendly', 'formal', 'casual', 'persuasive'];

export default function Compose() {
  const router = useRouter();
  const { mode, replyToId } = useLocalSearchParams<{ mode?: string; replyToId?: string }>();
  const { user } = useAuthUser();
  const { mailbox } = useMailbox(user);
  const { messages } = useMessages(user);

  const original = useMemo(
    () => (replyToId ? messages.find((m) => m.id === replyToId) : undefined),
    [messages, replyToId]
  );

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<AiTone>('professional');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!original) return;
    if (mode === 'reply') {
      setTo(extractEmail(original.from));
      setSubject(original.subject?.startsWith('Re:') ? original.subject : `Re: ${original.subject ?? ''}`);
      setBody(`\n\nOn ${new Date(original.createdAt).toLocaleString()}, ${extractName(original.from)} wrote:\n> ${(original.text || '').replace(/\n/g, '\n> ')}`);
    } else if (mode === 'forward') {
      setSubject(original.subject?.startsWith('Fwd:') ? original.subject : `Fwd: ${original.subject ?? ''}`);
      setBody(`\n\n---------- Forwarded message ----------\nFrom: ${original.from}\nSubject: ${original.subject}\n\n${original.text || ''}`);
    }
  }, [original, mode]);

  async function handleSend() {
    if (!to.trim() || !subject.trim()) {
      setSendError('Recipient and subject are required.');
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const html = `<p>${body.replace(/\n/g, '<br>')}</p>`;
      await sendMail({ to: to.trim(), subject: subject.trim(), html, text: body });
      router.back();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleAiGenerate() {
    if (!aiTopic.trim()) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const result = await aiCompose({ topic: aiTopic.trim(), tone: aiTone });
      if (result.subject) setSubject(result.subject);
      if (result.html) setBody(result.html.replace(/<[^>]+>/g, (tag) => (tag === '<br>' || tag === '<br/>' ? '\n' : '')).replace(/\n{3,}/g, '\n\n').trim());
      setAiOpen(false);
      setAiTopic('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI Compose failed. Please try again.');
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Message</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <Field label="To" value={to} onChangeText={setTo} placeholder="recipient@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Subject" />

        <Pressable onPress={() => setAiOpen((v) => !v)} style={styles.aiToggle}>
          <Text style={styles.aiToggleText}>✨ AI Compose</Text>
        </Pressable>

        {aiOpen && (
          <View style={styles.aiPanel}>
            <TextInput
              value={aiTopic}
              onChangeText={setAiTopic}
              placeholder="Describe what you want to write about…"
              placeholderTextColor={colors.faint}
              multiline
              style={styles.aiInput}
            />
            <View style={styles.toneRow}>
              {TONES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setAiTone(t)}
                  style={[styles.tonePill, aiTone === t && styles.tonePillActive]}
                >
                  <Text style={[styles.toneText, aiTone === t && styles.toneTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            {!!aiError && <Text style={styles.errorText}>{aiError}</Text>}
            <Pressable onPress={handleAiGenerate} disabled={aiBusy || !aiTopic.trim()} style={styles.generateBtn}>
              {aiBusy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.generateText}>Generate</Text>}
            </Pressable>
          </View>
        )}

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your message…"
          placeholderTextColor={colors.faint}
          multiline
          textAlignVertical="top"
          style={styles.bodyInput}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.fromText} numberOfLines={1}>From: {mailbox?.address ?? ''}</Text>
        {!!sendError && <Text style={styles.errorText}>{sendError}</Text>}
        <Pressable onPress={handleSend} disabled={sending} style={styles.sendBtn}>
          {sending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.sendText}>Send</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...rest} placeholderTextColor={colors.faint} style={styles.fieldInput} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.orange, borderBottomWidth: 3, borderBottomColor: colors.ink,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  close: { color: colors.white, fontSize: 18 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(22,23,28,0.14)', paddingHorizontal: 16, paddingVertical: 11,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, width: 60, textTransform: 'uppercase' },
  fieldInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  aiToggle: { paddingHorizontal: 16, paddingVertical: 10 },
  aiToggleText: { color: colors.orangeDark, fontWeight: '700', fontSize: 13 },
  aiPanel: { backgroundColor: colors.orangeTint, padding: 14, gap: 10 },
  aiInput: {
    backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.ink,
    padding: 10, fontSize: 13, minHeight: 56, color: colors.text,
  },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tonePill: { borderWidth: 1.5, borderColor: colors.ink, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: colors.bg },
  tonePillActive: { backgroundColor: colors.orange },
  toneText: { fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  toneTextActive: { color: colors.white },
  generateBtn: {
    backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.ink,
    alignItems: 'center', paddingVertical: 10, alignSelf: 'flex-start', paddingHorizontal: 20,
  },
  generateText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  bodyInput: { minHeight: 240, padding: 16, fontSize: 14, color: colors.text, lineHeight: 21 },
  footer: {
    borderTopWidth: 2, borderTopColor: colors.ink, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  },
  fromText: { flex: 1, fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  sendBtn: { backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.ink, paddingHorizontal: 20, paddingVertical: 9 },
  sendText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  errorText: { color: colors.red, fontSize: 12 },
});
