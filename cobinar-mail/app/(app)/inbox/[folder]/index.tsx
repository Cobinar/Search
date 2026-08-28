import React, { useMemo } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TopBar, MessageRow, MessageListSkeleton } from '@/components';
import { useAuthUser } from '@/auth';
import { useMailbox, useMessages, toggleStar, markRead, FOLDER_LABELS, CATEGORY_KEYS, type MailMessage } from '@/data';
import { colors } from '@/theme';

const EMPTY_COPY: Record<string, string> = {
  inbox: 'Your inbox is empty', starred: 'No starred messages', sent: 'No sent messages',
  drafts: 'No drafts saved', trash: 'Trash is empty', all: 'No messages yet',
  spam: 'No spam — nicely done', purchases: 'No purchase emails', bills: 'No bills here',
  social: 'No social updates', updates: 'No updates', forums: 'No forum activity',
  promotions: 'No promotions',
};

function filterMessages(messages: MailMessage[], folder: string): MailMessage[] {
  if (folder === 'starred') return messages.filter((m) => m.starred && m.folder !== 'trash' && m.folder !== 'spam');
  if (folder === 'all') return messages.filter((m) => m.folder !== 'trash' && m.folder !== 'spam');
  if ((CATEGORY_KEYS as readonly string[]).includes(folder)) {
    return messages.filter((m) => (m.folder || 'inbox') === 'inbox' && m.category === folder);
  }
  if (folder === 'inbox') return messages.filter((m) => (m.folder || 'inbox') === 'inbox' && !m.category);
  return messages.filter((m) => (m.folder || 'inbox') === folder);
}

export default function FolderScreen() {
  const { folder } = useLocalSearchParams<{ folder: string }>();
  const router = useRouter();
  const { user } = useAuthUser();
  const { mailbox } = useMailbox(user);
  const { messages, loading, error } = useMessages(user);

  const filtered = useMemo(() => filterMessages(messages, folder ?? 'inbox'), [messages, folder]);

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={FOLDER_LABELS[folder ?? 'inbox'] ?? folder} mailboxAddress={mailbox?.address} avatarUrl={mailbox?.picture} />
      <View style={styles.countRow}>
        <Text style={styles.count}>{loading ? ' ' : `${filtered.length} message${filtered.length === 1 ? '' : 's'}`}</Text>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* loading is only ever true on a genuine first-ever load with no
          cache to show yet — see useMessages in data.ts. Everything after
          that is instant, then updates live. */}
      {loading ? (
        <MessageListSkeleton />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageRow
              message={item}
              onPress={() => {
                if (!item.read && item.direction !== 'outbound') markRead(user.uid, item.id);
                router.push(`/message/${item.id}`);
              }}
              onToggleStar={() => toggleStar(user.uid, item.id, item.starred)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{EMPTY_COPY[folder ?? 'inbox'] ?? 'No messages'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  countRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: colors.ink },
  count: { fontSize: 12, color: colors.faint, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyText: { fontSize: 13, color: colors.faint, textAlign: 'center' },
  errorText: { color: colors.red, fontSize: 13, textAlign: 'center', padding: 12 },
});
