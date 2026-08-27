import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme/tokens';
import { FOLDER_LABELS, CATEGORY_KEYS } from '@/data/types';

const OPTIONS = ['inbox', ...CATEGORY_KEYS, '__spam__'] as const;

export function MoveToSheet({
  visible, onClose, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (dest: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Move to</Text>
          {OPTIONS.map((opt) => {
            const isSpam = opt === '__spam__';
            const iconId = isSpam ? 'spam' : opt;
            const label = isSpam ? 'Spam' : FOLDER_LABELS[opt] ?? opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onSelect(opt)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.orangeTint }]}
              >
                <Icon name={iconId} size={17} color={isSpam ? colors.red : colors.muted} />
                <Text style={[styles.rowLabel, isSpam && { color: colors.red }]}>{label}</Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,23,28,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg, borderTopWidth: 3, borderColor: colors.ink,
    paddingTop: 8, paddingBottom: 28, paddingHorizontal: 8,
  },
  handle: { width: 40, height: 4, backgroundColor: colors.faint, alignSelf: 'center', marginVertical: 8 },
  title: { fontSize: 13, fontWeight: '700', color: colors.muted, paddingHorizontal: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
});
