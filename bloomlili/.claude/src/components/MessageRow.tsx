import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme/tokens';
import { avatarColorKey, extractName } from '@/data/constants';
import type { MailMessage } from '@/data/types';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function MessageRow({
  message, onPress, onToggleStar,
}: {
  message: MailMessage;
  onPress: () => void;
  onToggleStar: () => void;
}) {
  const sender = message.direction === 'outbound' ? message.to : extractName(message.from);
  const initial = (sender.replace(/[^a-zA-Z]/g, '')[0] || '?').toUpperCase();
  const colorKey = avatarColorKey(message.from || '');
  const unread = !message.read && message.direction !== 'outbound';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        unread && { backgroundColor: colors.unread },
        pressed && { backgroundColor: colors.orangeTint },
      ]}
    >
      <Avatar initial={initial} colorKey={colorKey} avatarUrl={message.avatarUrl} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text numberOfLines={1} style={[styles.sender, unread && styles.unreadText]}>
            {sender}
          </Text>
          <Text style={styles.time}>{relativeTime(message.createdAt)}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.subject, unread && styles.unreadText]}>
          {message.subject || '(no subject)'}
        </Text>
        <Text numberOfLines={1} style={styles.snippet}>{message.snippet}</Text>
      </View>
      {unread && <View style={styles.dot} />}
      <Pressable hitSlop={10} onPress={onToggleStar} style={styles.starBtn}>
        <Icon
          name="starred"
          size={16}
          color={message.starred ? '#F59E0B' : colors.faint}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(22,23,28,0.10)',
    alignItems: 'flex-start',
  },
  body: { flex: 1, minWidth: 0 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  sender: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.muted },
  unreadText: { fontWeight: '800', color: colors.text },
  time: { fontSize: 11, color: colors.faint },
  subject: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 2 },
  snippet: { fontSize: 12, color: colors.faint },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange, marginTop: 5 },
  starBtn: { padding: 2 },
});
