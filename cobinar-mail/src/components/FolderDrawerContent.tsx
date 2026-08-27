import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme/tokens';
import { FOLDER_LABELS, CATEGORY_KEYS, type MailMessage } from '@/data/types';

interface Props {
  messages: MailMessage[];
  activeFolder: string;
  onNavigate: (folder: string) => void;
  onCompose: () => void;
}

function countFor(messages: MailMessage[], folder: string): number {
  const inInbox = (m: MailMessage) => (m.folder || 'inbox') === 'inbox' && !m.read && m.direction !== 'outbound';
  if (folder === 'inbox') return messages.filter((m) => inInbox(m) && !m.category).length;
  if (folder === 'spam') return messages.filter((m) => m.folder === 'spam' && !m.read).length;
  if ((CATEGORY_KEYS as readonly string[]).includes(folder)) {
    return messages.filter((m) => inInbox(m) && m.category === folder).length;
  }
  return 0;
}

function Row({
  id, label, active, badge, onPress,
}: { id: string; label: string; active: boolean; badge?: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, active && styles.rowActive]}
    >
      <Icon name={id} size={17} color={active ? colors.white : colors.muted} />
      <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{label}</Text>
      {!!badge && (
        <View style={[styles.badge, active && styles.badgeActive]}>
          <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function FolderDrawerContent({ messages, activeFolder, onNavigate, onCompose }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Pressable onPress={onCompose} style={styles.composeBtn}>
        <Text style={styles.composeText}>✏️  Compose</Text>
      </Pressable>

      <Row id="inbox" label="Inbox" active={activeFolder === 'inbox'} badge={countFor(messages, 'inbox')} onPress={() => onNavigate('inbox')} />

      <Text style={styles.sectionLabel}>CATEGORIES</Text>
      {CATEGORY_KEYS.map((cat) => (
        <Row
          key={cat}
          id={cat}
          label={FOLDER_LABELS[cat]}
          active={activeFolder === cat}
          badge={countFor(messages, cat)}
          onPress={() => onNavigate(cat)}
        />
      ))}

      <View style={styles.divider} />
      <Row id="starred" label="Starred" active={activeFolder === 'starred'} onPress={() => onNavigate('starred')} />
      <Row id="sent" label="Sent" active={activeFolder === 'sent'} onPress={() => onNavigate('sent')} />
      <Row id="drafts" label="Drafts" active={activeFolder === 'drafts'} onPress={() => onNavigate('drafts')} />

      <View style={styles.divider} />
      <Row id="all" label="All Mail" active={activeFolder === 'all'} onPress={() => onNavigate('all')} />
      <Row id="spam" label="Spam" active={activeFolder === 'spam'} badge={countFor(messages, 'spam')} onPress={() => onNavigate('spam')} />
      <Row id="trash" label="Trash" active={activeFolder === 'trash'} onPress={() => onNavigate('trash')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 14 },
  composeBtn: {
    backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.ink,
    paddingVertical: 13, paddingHorizontal: 18, marginBottom: 14,
  },
  composeText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 12, marginBottom: 3,
    borderWidth: 2, borderColor: 'transparent',
  },
  rowActive: { backgroundColor: colors.orange, borderColor: colors.ink },
  rowLabel: { fontSize: 13, fontWeight: '500', color: colors.muted, flex: 1 },
  rowLabelActive: { color: colors.white, fontWeight: '700' },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.7, color: colors.faint,
    marginTop: 10, marginBottom: 4, paddingHorizontal: 10,
  },
  divider: { height: 1, backgroundColor: 'rgba(22,23,28,0.14)', marginVertical: 10 },
  badge: {
    minWidth: 19, height: 19, paddingHorizontal: 5, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeActive: { backgroundColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  badgeTextActive: { color: colors.orangeDark },
});
