import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useDrawer } from '@/navigation/DrawerContext';
import { colors } from '@/theme/tokens';

export function TopBar({
  title, mailboxAddress, avatarUrl, onAvatarPress,
}: {
  title: string;
  mailboxAddress?: string;
  avatarUrl?: string;
  onAvatarPress?: () => void;
}) {
  const { toggle } = useDrawer();

  return (
    <View style={styles.bar}>
      <Pressable onPress={toggle} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Menu">
        <HamburgerGlyph />
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!mailboxAddress && <Text style={styles.subtitle} numberOfLines={1}>{mailboxAddress}</Text>}
      </View>
      {!!avatarUrl && (
        <Pressable onPress={onAvatarPress} style={styles.avatarBtn}>
          <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
        </Pressable>
      )}
    </View>
  );
}

function HamburgerGlyph() {
  return (
    <View style={{ gap: 3, position: 'absolute' }}>
      <View style={{ width: 18, height: 2, backgroundColor: colors.muted }} />
      <View style={{ width: 18, height: 2, backgroundColor: colors.muted }} />
      <View style={{ width: 18, height: 2, backgroundColor: colors.muted }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    height: 58, paddingHorizontal: 14,
    backgroundColor: colors.paper, borderBottomWidth: 3, borderBottomColor: colors.ink,
  },
  iconBtn: {
    width: 36, height: 36, borderWidth: 2, borderColor: colors.ink,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  titleWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 10.5, color: colors.orangeDark, fontWeight: '600' },
  avatarBtn: {
    width: 34, height: 34, borderWidth: 2, borderColor: colors.ink, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
});
