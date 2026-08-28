import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Avatar, Icon, VerifiedBadge, MoveToSheet } from '@/components';
import { useAuthUser } from '@/auth';
import { useMessages, toggleStar, trashMessage, moveMessage, extractName, avatarColorKey } from '@/data';
import { sanitizeHtml } from '@/security';
import { colors } from '@/theme';

/**
 * Sanitize FIRST (strips <script>, event handlers, iframes, etc. — see
 * sanitizeHtml in security.ts), and only then is it safe to let the page
 * run its own JavaScript. That's what makes accurate height measurement
 * possible: the injected script below measures real content height and
 * posts it back, instead of the rough per-character guess this used to
 * ship with (which is exactly what was cutting long emails off — a
 * guess is either wasteful or wrong, never both right and tight).
 */
const MEASURE_SCRIPT = `
(function () {
  function post() {
    try {
      var h = document.body.scrollHeight;
      window.ReactNativeWebView.postMessage(String(h));
    } catch (e) {}
  }
  post();
  window.addEventListener('load', post);
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('load', post);
    img.addEventListener('error', post);
  });
  try {
    new ResizeObserver(post).observe(document.body);
  } catch (e) {
    setTimeout(post, 400);
    setTimeout(post, 1200);
  }
  true;
})();
`;

function wrapHtml(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body { margin: 0; padding: 4px; }
    body { font-family: -apple-system, Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #16171C; }
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
  const [moveOpen, setMoveOpen] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(200);

  const message = useMemo(() => messages.find((m) => m.id === id), [messages, id]);

  const safeHtml = useMemo(() => {
    if (!message) return '';
    const raw = message.html || `<p>${(message.text || '').replace(/\n/g, '<br>')}</p>`;
    return sanitizeHtml(raw);
  }, [message]);

  if (!user || !message) return null;

  const sender = extractName(message.from);
  const initial = (sender.replace(/[^a-zA-Z]/g, '')[0] || '?').toUpperCase();
  const colorKey = avatarColorKey(message.from || '');

  function onWebViewMessage(event: WebViewMessageEvent) {
    const h = Number(event.nativeEvent.data);
    if (Number.isFinite(h) && h > 0) setBodyHeight(Math.min(Math.max(h + 16, 80), 6000));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.toolbar}>
        <ToolBtn icon="back" onPress={() => router.back()} />
        <ToolBtn icon="reply" onPress={() => router.push({ pathname: '/compose', params: { mode: 'reply', replyToId: message.id } })} />
        <ToolBtn icon="forward" onPress={() => router.push({ pathname: '/compose', params: { mode: 'forward', replyToId: message.id } })} />
        <ToolBtn icon="starred" color={message.starred ? '#F59E0B' : colors.muted} onPress={() => toggleStar(user.uid, message.id, message.starred)} />
        <ToolBtn icon="move" onPress={() => setMoveOpen(true)} />
        <View style={{ flex: 1 }} />
        <ToolBtn icon="trash" color={colors.red} onPress={() => { trashMessage(user.uid, message.id); router.back(); }} />
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

        <View style={{ height: bodyHeight }}>
          <WebView
            source={{ html: wrapHtml(safeHtml) }}
            javaScriptEnabled
            domStorageEnabled={false}
            injectedJavaScript={MEASURE_SCRIPT}
            onMessage={onWebViewMessage}
            originWhitelist={['about:blank']}
            style={{ backgroundColor: 'transparent' }}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      <MoveToSheet
        visible={moveOpen}
        onClose={() => setMoveOpen(false)}
        onSelect={(dest) => { setMoveOpen(false); moveMessage(user.uid, message.id, dest); router.back(); }}
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
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: colors.ink },
  toolBtn: { width: 36, height: 36, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  subject: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 },
  metaCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, padding: 14, marginBottom: 20, alignItems: 'flex-start' },
  fromName: { fontSize: 14, fontWeight: '700', color: colors.text },
  fromAddr: { fontSize: 12, color: colors.muted, marginTop: 2 },
  toLine: { fontSize: 12, color: colors.faint, marginTop: 2 },
  date: { fontSize: 11, color: colors.faint },
});
