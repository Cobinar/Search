import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { MoveToSheet } from '@/components/MoveToSheet';
import { useAuthUser } from '@/auth/useAuthUser';
import { useMessages, toggleStar, trashMessage, moveMessage } from '@/data/useMessages';
import { extractName, avatarColorKey } from '@/data/constants';
import { colors } from '@/theme/tokens';

function estimateBodyHeight(html: string): number {
  // See the note above the WebView below: JS is disabled in it for
  // security, so it can't report its own scrollHeight back to RN. This is
  // a rough heuristic instead of a real measurement — clamped so an
  // unusually short or long email doesn't produce a broken layout.
  const roughLines = Math.ceil((html || '').replace(/<[^>]+>/g, ' ').length / 55);
  return Math.min(Math.max(roughLines * 22, 120), 2400);
}

function wrapHtml(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, Roboto, sans-serif; font-size: 15px; line-height: 1.6;
           color: #16171C; margin: 0; padding: 4px; }
    a { color: #EA6C09; }
    img { max-width: 100%; height: auto; }
    blockquote { border-left: 3px solid #16171C; margin: 8px 0; padding-left: 14px; color: #565A63; }
  </style></head><body>${bodyHtml || ''}</body></html>`;
}

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthUser();
  const { messages } = useMessages(user);
  const [moveOpen, setMoveOpen] = React.useState(false);

  const message = useMemo(() => messages.find((m) => m.id === id), [messages, id]);

  if (!user || !message) return null;

  const sender = extractName(message.from);
  const initial = (sender.replace(/[^a-zA-Z]/g, '')[0] || '?').toUpperCase();
  const colorKey = avatarColorKey(message.from || '');
  const bodyHeight = estimateBodyHeight(message.html || message.text);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.toolbar}>
        <ToolBtn icon="back" onPress={() => router.back()} />
        <ToolBtn
          icon="reply"
          onPress={() => router.push({ pathname: '/(app)/compose', params: { mode: 'reply', replyToId: message.id } })}
        />
        <ToolBtn
          icon="forward"
          onPress={() => router.push({ pathname: '/(app)/compose', params: { mode: 'forward', replyToId: message.id } })}
        />
        <ToolBtn
          icon="starred"
          color={message.starred ? '#F59E0B' : colors.muted}
          onPress={() => toggleStar(user.uid, message.id, message.starred)}
        />
        <ToolBtn icon="move" onPress={() => setMoveOpen(true)} />
        <View style={{ flex: 1 }} />
        <ToolBtn
          icon="trash"
          color={colors.red}
          onPress={() => { trashMessage(user.uid, message.id); router.back(); }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subject}>{message.subject || '(no subject)'}</Text>

        <View style={styles.metaCard}>
          <Avatar initial={initial} colorKey={colorKey} avatarUrl={message.avatarUrl} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fromName}>{sender}</Text>
            <Text style={styles.fromAddr}>{message.from}</Text>
            <Text style={styles.toLine}>To: {message.to}</Text>
            {message.verified && <View style={{ marginTop: 6 }}><VerifiedBadge /></View>}
          </View>
          <Text style={styles.date}>{new Date(message.createdAt).toLocaleString()}</Text>
        </View>

        {/*
          javaScriptEnabled is deliberately false: this renders HTML from
          arbitrary senders (including regular inbound mail with no
          verification at all — see VerifiedBadge), and a mail client
          should never let message content execute script. The tradeoff
          is losing an auto-measured content height — see
          estimateBodyHeight above.
        */}
        <View style={{ height: bodyHeight }}>
          <WebView
            source={{ html: wrapHtml(message.html || `<p>${(message.text || '').replace(/\n/g, '<br>')}</p>`) }}
            javaScriptEnabled={false}
            domStorageEnabled={false}
            originWhitelist={['about:blank']}
            style={{ backgroundColor: 'transparent' }}
          />
        </View>
      </ScrollView>

      <MoveToSheet
        visible={moveOpen}
        onClose={() => setMoveOpen(false)}
        onSelect={(dest) => {
          setMoveOpen(false);
          moveMessage(user.uid, message.id, dest);
          router.back();
        }}
      />
    </View>
  );
}

function ToolBtn({ icon, onPress, color }: { icon: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={styles.toolBtn}>
      <Icon name={icon} size={16} color={color ?? colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: colors.ink,
  },
  toolBtn: {
    width: 36, height: 36, borderWidth: 2, borderColor: colors.ink,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 20 },
  subject: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 },
  metaCard: {
    flexDirection: 'row', gap: 12, backgroundColor: colors.paper,
    borderWidth: 2, borderColor: colors.ink, padding: 14, marginBottom: 20, alignItems: 'flex-start',
  },
  fromName: { fontSize: 14, fontWeight: '700', color: colors.text },
  fromAddr: { fontSize: 12, color: colors.muted, marginTop: 2 },
  toLine: { fontSize: 12, color: colors.faint, marginTop: 2 },
  date: { fontSize: 11, color: colors.faint },
});
