import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  View, Text, Pressable, Image, ScrollView, Modal, StyleSheet,
  type ViewStyle, type StyleProp,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, avatarPalette, borderWidth as bw } from '@/theme';
import { FOLDER_LABELS, CATEGORY_KEYS, FOLDER_ICON_PATHS, extractName, avatarColorKey, type MailMessage } from '@/data';

/* ────────────────────────────────────────────────────────────────
   Hard-shadow primitives — RN has no box-shadow, so this is a real
   ink-colored View behind the content, offset down-right.
   ──────────────────────────────────────────────────────────────── */
export function HardShadowBox({
  offset = 3, style, children,
}: { offset?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <View style={{ marginRight: offset, marginBottom: offset }}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: offset, left: offset, backgroundColor: colors.ink }]} />
      <View style={style}>{children}</View>
    </View>
  );
}

export function NeoButton({
  onPress, children, variant = 'default', style, disabled, accessibilityLabel,
}: {
  onPress: () => void; children: React.ReactNode;
  variant?: 'default' | 'primary' | 'danger'; style?: StyleProp<ViewStyle>;
  disabled?: boolean; accessibilityLabel?: string;
}) {
  const bg = variant === 'primary' ? colors.orange : colors.bg;
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      style={{ marginRight: 3, marginBottom: 3, opacity: disabled ? 0.5 : 1 }}
    >
      {({ pressed }) => (
        <View style={{ position: 'relative' }}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: pressed ? 1 : 3, left: pressed ? 1 : 3, backgroundColor: colors.ink }]} />
          <View
            style={[
              {
                borderWidth: bw.standard, borderColor: colors.ink, backgroundColor: bg,
                paddingVertical: 9, paddingHorizontal: 16,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
                transform: [{ translateX: pressed ? 1 : 0 }, { translateY: pressed ? 1 : 0 }],
              },
              variant === 'danger' && { borderColor: colors.red },
              style,
            ]}
          >
            {children}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────
   Icons — ported SVG path data, rendered with react-native-svg.
   ──────────────────────────────────────────────────────────────── */
export function Icon({ name, size = 18, color }: { name: string; size?: number; color: string }) {
  const def = FOLDER_ICON_PATHS[name];
  if (!def) return null;
  const strokeProps = def.filled
    ? { fill: color }
    : { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'bills' && (
        <>
          <Rect x={5} y={3} width={14} height={18} rx={1} fill="none" stroke={color} strokeWidth={1.8} />
          <Path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth={1.8} fill="none" />
        </>
      )}
      {name === 'spam' && (
        <>
          <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={1.8} />
          <Path d={def.paths[0]} stroke={color} strokeWidth={1.8} fill="none" />
        </>
      )}
      {name !== 'bills' && name !== 'spam' && def.paths.map((d, i) => <Path key={i} d={d} {...strokeProps} />)}
    </Svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   Avatar — colored initials, real photo on top with graceful fallback.
   ──────────────────────────────────────────────────────────────── */
export function Avatar({ initial, colorKey, avatarUrl, size = 36 }: {
  initial: string; colorKey: string; avatarUrl?: string; size?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const bg = avatarPalette[colorKey] ?? colors.orange;
  const showImage = !!avatarUrl && !imageFailed;

  return (
    <View style={[avatarStyles.base, { width: size, height: size, backgroundColor: bg }]}>
      <Text style={[avatarStyles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      {showImage && (
        <Image
          source={{ uri: avatarUrl }}
          onError={() => setImageFailed(true)}
          style={StyleSheet.absoluteFillObject}
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}
const avatarStyles = StyleSheet.create({
  base: { borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: colors.white, fontWeight: '800' },
});

/* ────────────────────────────────────────────────────────────────
   Verified-sender badge
   ──────────────────────────────────────────────────────────────── */
/** Only ever true for mail written by handleSendMail's cobinar-to-cobinar
 *  fast path — the sender was a Firebase-authenticated mailbox holder at
 *  send time, not just a claimed From header. Regular inbound mail never
 *  shows this, same as real email is unverified without SPF/DKIM/DMARC. */
export function VerifiedBadge() {
  return (
    <View style={verifiedStyles.pill}>
      <Text style={verifiedStyles.text}>✓ Verified sender</Text>
    </View>
  );
}
const verifiedStyles = StyleSheet.create({
  pill: { borderWidth: 1.5, borderColor: colors.green, backgroundColor: '#E9F9EF', paddingHorizontal: 9, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { color: colors.green, fontSize: 11, fontWeight: '700' },
});

/* ────────────────────────────────────────────────────────────────
   Skeleton loaders — shown only on a genuinely first-ever load (no
   cache yet); a shimmering placeholder that matches each shape it
   stands in for, rather than a generic spinner.
   ──────────────────────────────────────────────────────────────── */
function useShimmer() {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1, true);
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function SkeletonBlock({ width, height, style }: { width: number | `${number}%`; height: number; style?: StyleProp<ViewStyle> }) {
  const shimmerStyle = useShimmer();
  return <Animated.View style={[{ width, height, backgroundColor: '#E4E1D8' }, shimmerStyle, style]} />;
}

export function MessageRowSkeleton() {
  return (
    <View style={skeletonStyles.row}>
      <SkeletonBlock width={36} height={36} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width="55%" height={11} />
        <SkeletonBlock width="80%" height={11} />
        <SkeletonBlock width="40%" height={10} />
      </View>
    </View>
  );
}

export function MessageListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => <MessageRowSkeleton key={i} />)}
    </View>
  );
}
const skeletonStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 11, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(22,23,28,0.08)' },
});

/* ────────────────────────────────────────────────────────────────
   Message list row
   ──────────────────────────────────────────────────────────────── */
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

export function MessageRow({ message, onPress, onToggleStar }: {
  message: MailMessage; onPress: () => void; onToggleStar: () => void;
}) {
  const sender = message.direction === 'outbound' ? message.to : extractName(message.from);
  const initial = (sender.replace(/[^a-zA-Z]/g, '')[0] || '?').toUpperCase();
  const colorKey = avatarColorKey(message.from || '');
  const unread = !message.read && message.direction !== 'outbound';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, unread && { backgroundColor: colors.unread }, pressed && { backgroundColor: colors.orangeTint }]}
    >
      <Avatar initial={initial} colorKey={colorKey} avatarUrl={message.avatarUrl} />
      <View style={rowStyles.body}>
        <View style={rowStyles.topLine}>
          <Text numberOfLines={1} style={[rowStyles.sender, unread && rowStyles.unreadText]}>{sender}</Text>
          <Text style={rowStyles.time}>{relativeTime(message.createdAt)}</Text>
        </View>
        <Text numberOfLines={1} style={[rowStyles.subject, unread && rowStyles.unreadText]}>{message.subject || '(no subject)'}</Text>
        <Text numberOfLines={1} style={rowStyles.snippet}>{message.snippet}</Text>
      </View>
      {unread && <View style={rowStyles.dot} />}
      <Pressable hitSlop={10} onPress={onToggleStar} style={rowStyles.starBtn}>
        <Icon name="starred" size={16} color={message.starred ? '#F59E0B' : colors.faint} />
      </Pressable>
    </Pressable>
  );
}
// (extractName / avatarColorKey come from @/data — no local copies needed)
const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 11, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(22,23,28,0.10)', alignItems: 'flex-start' },
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

/* ────────────────────────────────────────────────────────────────
   Drawer content (folder list)
   ──────────────────────────────────────────────────────────────── */
function countFor(messages: MailMessage[], folder: string): number {
  const inInbox = (m: MailMessage) => (m.folder || 'inbox') === 'inbox' && !m.read && m.direction !== 'outbound';
  if (folder === 'inbox') return messages.filter((m) => inInbox(m) && !m.category).length;
  if (folder === 'spam') return messages.filter((m) => m.folder === 'spam' && !m.read).length;
  if ((CATEGORY_KEYS as readonly string[]).includes(folder)) return messages.filter((m) => inInbox(m) && m.category === folder).length;
  return 0;
}

function DrawerRow({ id, label, active, badge, onPress }: { id: string; label: string; active: boolean; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[drawerStyles.row, active && drawerStyles.rowActive]}>
      <Icon name={id} size={17} color={active ? colors.white : colors.muted} />
      <Text style={[drawerStyles.rowLabel, active && drawerStyles.rowLabelActive]}>{label}</Text>
      {!!badge && (
        <View style={[drawerStyles.badge, active && drawerStyles.badgeActive]}>
          <Text style={[drawerStyles.badgeText, active && drawerStyles.badgeTextActive]}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function FolderDrawerContent({ messages, activeFolder, onNavigate, onCompose }: {
  messages: MailMessage[]; activeFolder: string; onNavigate: (folder: string) => void; onCompose: () => void;
}) {
  return (
    <ScrollView style={drawerStyles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Pressable onPress={onCompose} style={drawerStyles.composeBtn}>
        <Text style={drawerStyles.composeText}>✏️  Compose</Text>
      </Pressable>

      <DrawerRow id="inbox" label="Inbox" active={activeFolder === 'inbox'} badge={countFor(messages, 'inbox')} onPress={() => onNavigate('inbox')} />

      <Text style={drawerStyles.sectionLabel}>CATEGORIES</Text>
      {CATEGORY_KEYS.map((cat) => (
        <DrawerRow key={cat} id={cat} label={FOLDER_LABELS[cat]} active={activeFolder === cat} badge={countFor(messages, cat)} onPress={() => onNavigate(cat)} />
      ))}

      <View style={drawerStyles.divider} />
      <DrawerRow id="starred" label="Starred" active={activeFolder === 'starred'} onPress={() => onNavigate('starred')} />
      <DrawerRow id="sent" label="Sent" active={activeFolder === 'sent'} onPress={() => onNavigate('sent')} />
      <DrawerRow id="drafts" label="Drafts" active={activeFolder === 'drafts'} onPress={() => onNavigate('drafts')} />

      <View style={drawerStyles.divider} />
      <DrawerRow id="all" label="All Mail" active={activeFolder === 'all'} onPress={() => onNavigate('all')} />
      <DrawerRow id="spam" label="Spam" active={activeFolder === 'spam'} badge={countFor(messages, 'spam')} onPress={() => onNavigate('spam')} />
      <DrawerRow id="trash" label="Trash" active={activeFolder === 'trash'} onPress={() => onNavigate('trash')} />
    </ScrollView>
  );
}
const drawerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 14 },
  composeBtn: { backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.ink, paddingVertical: 13, paddingHorizontal: 18, marginBottom: 14 },
  composeText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 3, borderWidth: 2, borderColor: 'transparent' },
  rowActive: { backgroundColor: colors.orange, borderColor: colors.ink },
  rowLabel: { fontSize: 13, fontWeight: '500', color: colors.muted, flex: 1 },
  rowLabelActive: { color: colors.white, fontWeight: '700' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, color: colors.faint, marginTop: 10, marginBottom: 4, paddingHorizontal: 10 },
  divider: { height: 1, backgroundColor: 'rgba(22,23,28,0.14)', marginVertical: 10 },
  badge: { minWidth: 19, height: 19, paddingHorizontal: 5, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  badgeActive: { backgroundColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  badgeTextActive: { color: colors.orangeDark },
});

/* ────────────────────────────────────────────────────────────────
   Move-to bottom sheet
   ──────────────────────────────────────────────────────────────── */
const MOVE_OPTIONS = ['inbox', ...CATEGORY_KEYS, '__spam__'] as const;

export function MoveToSheet({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (dest: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>Move to</Text>
          {MOVE_OPTIONS.map((opt) => {
            const isSpam = opt === '__spam__';
            const iconId = isSpam ? 'spam' : opt;
            const label = isSpam ? 'Spam' : FOLDER_LABELS[opt] ?? opt;
            return (
              <Pressable key={opt} onPress={() => onSelect(opt)} style={({ pressed }) => [sheetStyles.row, pressed && { backgroundColor: colors.orangeTint }]}>
                <Icon name={iconId} size={17} color={isSpam ? colors.red : colors.muted} />
                <Text style={[sheetStyles.rowLabel, isSpam && { color: colors.red }]}>{label}</Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,23,28,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopWidth: 3, borderColor: colors.ink, paddingTop: 8, paddingBottom: 28, paddingHorizontal: 8 },
  handle: { width: 40, height: 4, backgroundColor: colors.faint, alignSelf: 'center', marginVertical: 8 },
  title: { fontSize: 13, fontWeight: '700', color: colors.muted, paddingHorizontal: 12, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
});

/* ────────────────────────────────────────────────────────────────
   Top bar
   ──────────────────────────────────────────────────────────────── */
export function TopBar({ title, mailboxAddress, avatarUrl, onAvatarPress }: {
  title: string; mailboxAddress?: string; avatarUrl?: string; onAvatarPress?: () => void;
}) {
  const { toggle } = useDrawer();
  const insets = useSafeAreaInsets();
  return (
    <View style={[topBarStyles.bar, { height: 58 + insets.top, paddingTop: insets.top }]}>
      <Pressable onPress={toggle} hitSlop={10} style={topBarStyles.iconBtn} accessibilityLabel="Menu">
        <View style={{ gap: 3 }}>
          <View style={{ width: 18, height: 2, backgroundColor: colors.muted }} />
          <View style={{ width: 18, height: 2, backgroundColor: colors.muted }} />
          <View style={{ width: 18, height: 2, backgroundColor: colors.muted }} />
        </View>
      </Pressable>
      <View style={topBarStyles.titleWrap}>
        <Text style={topBarStyles.title} numberOfLines={1}>{title}</Text>
        {!!mailboxAddress && <Text style={topBarStyles.subtitle} numberOfLines={1}>{mailboxAddress}</Text>}
      </View>
      {!!avatarUrl && (
        <Pressable onPress={onAvatarPress} style={topBarStyles.avatarBtn}>
          <Image source={{ uri: avatarUrl }} style={topBarStyles.avatarImg} />
        </Pressable>
      )}
    </View>
  );
}
const topBarStyles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, backgroundColor: colors.paper, borderBottomWidth: 3, borderBottomColor: colors.ink },
  iconBtn: { width: 36, height: 36, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 10.5, color: colors.orangeDark, fontWeight: '600' },
  avatarBtn: { width: 34, height: 34, borderWidth: 2, borderColor: colors.ink, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
});

/* ────────────────────────────────────────────────────────────────
   Drawer open/close context — shared between the hamburger button (in
   TopBar, rendered per-screen) and the drawer overlay itself (rendered
   once in the (app) layout).
   ──────────────────────────────────────────────────────────────── */
interface DrawerContextValue { isOpen: boolean; open: () => void; close: () => void; toggle: () => void; }
const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  return <DrawerContext.Provider value={{ isOpen, open, close, toggle }}>{children}</DrawerContext.Provider>;
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used within DrawerProvider');
  return ctx;
}
