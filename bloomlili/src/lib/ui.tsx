// ═══════════════════════════════════════════════════════════════════════════
//  lib/ui.tsx — Shared icons + neo-brutalist UI kit + styles
//  Cobinar Systems · Marc-Arthur Samuel Dalus
//  Every icon here is hand-authored SVG (react-native-svg) — no emoji-as-
//  icon, no icon font library, per the "only use SVG" constraint.
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator, Image } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { L, GRADS, EMOJIS } from './bloomlili';

// ── Icons ────────────────────────────────────────────────────────────────

export function MailIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}><Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round" /><Path d="M22 6l-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" /></Svg>);
}
export function GuestIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><Circle cx={12} cy={7} r={4} /></Svg>);
}
export function BackChevron({ color = L.ink }: { color?: string }) {
  return (<Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}><Path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></Svg>);
}
export function CloseIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}><Path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></Svg>);
}
export function HomeIcon({ color }: { color: string }) {
  return (<Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M4 10.5L12 3l8 7.5V21a1 1 0 01-1 1H5a1 1 0 01-1-1z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M9 22V12h6v10" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>);
}
export function ChatTabIcon({ color }: { color: string }) {
  return (<Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M20 2H4a2 2 0 00-2 2v13a2 2 0 002 2h3l3 3 3-3h7a2 2 0 002-2V4a2 2 0 00-2-2z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M8 10h8M8 14h5" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>);
}
export function DiscoverIcon({ color }: { color: string }) {
  return (<Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Circle cx={12} cy={12} r={3} /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><Path d="M5.636 5.636l2.122 2.122M16.243 16.243l2.121 2.121M16.243 7.757l2.121-2.121M5.636 18.364l2.122-2.121" /></Svg>);
}
export function BellIcon({ color }: { color: string }) {
  return (<Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M6 8a6 6 0 0112 0c0 5.25 2 7.5 3 8.5H3c1-1 3-3.25 3-8.5z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M10.3 21a1.94 1.94 0 003.4 0" stroke={color} strokeWidth={2.2} strokeLinecap="round" /></Svg>);
}
export function ProfileTabIcon({ color }: { color: string }) {
  return (<Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2.2} strokeLinecap="round" /><Path d="M4 20c0-3.866 3.582-7 8-7s8 3.134 8 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" /></Svg>);
}
export function EditIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 20h9" /><Path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></Svg>);
}
export function CameraIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><Circle cx={12} cy={13} r={4} /></Svg>);
}
export function SignOutIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><Path d="M16 17l5-5-5-5" /><Path d="M21 12H9" /></Svg>);
}
export function SettingsIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Circle cx={12} cy={12} r={3} /><Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></Svg>);
}
export function SparkIcon({ color = L.ink }: { color?: string }) {
  return (<Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}><Path d="M12 2L20.8 7v10L12 22 3.2 17V7z" strokeLinejoin="round" /></Svg>);
}
export function PlusIcon({ color = '#fff' }: { color?: string }) {
  return (<Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3}><Path d="M12 5v14M5 12h14" strokeLinecap="round" /></Svg>);
}
export function PlayBadgeIcon() {
  return (<Svg width={22} height={22} viewBox="0 0 24 24" fill="#fff"><Path d="M8 5v14l11-7z" /></Svg>);
}
export function EmptyGridIcon() {
  return (<Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={L.faint} strokeWidth={1.5}><Rect x={3} y={3} width={18} height={18} rx={3} /></Svg>);
}
export function ChevronRight({ color = L.faint }: { color?: string }) {
  return (<Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2}><Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></Svg>);
}
export function SendIcon({ color = '#111' }: { color?: string }) {
  return (<Svg width={17} height={17} viewBox="0 0 24 24" fill={color}><Path d="M2 21l21-9L2 3v7l15 2-15 2z" /></Svg>);
}
export function BellOffIcon({ color = L.faint }: { color?: string }) {
  return (<Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6}><Path d="M6 8a6 6 0 0112 0c0 5.25 2 7.5 3 8.5H3c1-1 3-3.25 3-8.5z" strokeLinecap="round" strokeLinejoin="round" /><Path d="M10.3 21a1.94 1.94 0 003.4 0" strokeLinecap="round" /></Svg>);
}

// ── Shared UI kit ────────────────────────────────────────────────────────

export function NBButton({ label, onPress, disabled, loading, variant = 'prim' }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'prim' | 'ghost' }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [nb.btn, variant === 'prim' ? nb.btnPrim : nb.btnGhost, pressed && nb.btnPressed, (disabled || loading) && nb.btnDisabled]}>
      {loading ? <ActivityIndicator color={L.ink} /> : <Text style={nb.btnText}>{label}</Text>}
    </Pressable>
  );
}
export function NBInput(props: React.ComponentProps<typeof TextInput> & { errorText?: string | null }) {
  const { errorText, style, ...rest } = props;
  return (
    <View style={{ marginTop: 10 }}>
      <TextInput placeholderTextColor={L.faint} style={[nb.input, style]} {...rest} />
      {!!errorText && <Text style={nb.errText}>{errorText}</Text>}
    </View>
  );
}
export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (<Pressable onPress={onPress} style={nb.backBtn} hitSlop={8}><BackChevron /><Text style={nb.backText}>{label}</Text></Pressable>);
}
export function AvatarGrid({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <View style={nb.avaGrid}>
      {GRADS.map(([a, b], i) => (
        <Pressable key={i} onPress={() => onChange(i)} style={[nb.avaSlot, value === i && nb.avaSlotOn]}>
          <LinearGradient colors={[a, b]} start={{ x: 0.15, y: 0.15 }} end={{ x: 0.85, y: 0.85 }} style={nb.avaFill}>
            <Text style={{ fontSize: 20 }}>{EMOJIS[i]}</Text>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}
export function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[shell.header, { paddingTop: insets.top + 10 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={shell.headerBack}><BackChevron /></Pressable>
      ) : <View style={{ width: 30 }} />}
      <Text style={shell.headerTitle}>{title}</Text>
      <View style={{ width: 30 }} />
    </View>
  );
}
// avatarUrl takes priority when set (real photo); falls back to the
// gradient+emoji preset otherwise.
export function AvatarBubble({ avatarIdx, avatarUrl, size = 44 }: { avatarIdx: number; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: L.ink, backgroundColor: '#eee' }}
      />
    );
  }
  return (
    <LinearGradient colors={GRADS[avatarIdx] ?? GRADS[0]} start={{ x: 0.15, y: 0.15 }} end={{ x: 0.85, y: 0.85 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.45 }}>{EMOJIS[avatarIdx] ?? '🌸'}</Text>
    </LinearGradient>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

export const nb = StyleSheet.create({
  screenPad: { padding: 24, paddingTop: 60, flexGrow: 1 },
  stepTitle: { fontWeight: '900', fontSize: 22, color: L.ink },
  stepSub: { fontSize: 13, color: L.sub, fontWeight: '500', marginTop: 4, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: L.ink, marginBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 13, fontWeight: '700', color: L.ink },
  input: { width: '100%', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, borderWidth: 3, borderColor: L.ink, fontSize: 15, fontWeight: '600', color: L.ink, backgroundColor: '#fff' },
  errText: { fontSize: 11, fontWeight: '700', color: L.error, marginTop: 4, paddingLeft: 2 },
  authToggle: { flexDirection: 'row', backgroundColor: '#F2F2F2', borderRadius: 12, padding: 4, marginBottom: 18 },
  atBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  atBtnOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  atBtnText: { fontSize: 13, fontWeight: '800', color: L.ink },
  btn: { width: '100%', paddingVertical: 14, borderRadius: 14, borderWidth: 3, borderColor: L.ink, alignItems: 'center', justifyContent: 'center' },
  btnPrim: { backgroundColor: L.lime },
  btnGhost: { backgroundColor: '#fff' },
  btnPressed: { transform: [{ translateX: 3 }, { translateY: 3 }] },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '800', color: L.ink },
  methodBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14, borderWidth: 3, borderColor: L.ink, backgroundColor: '#fff' },
  methodIco: { width: 38, height: 38, borderRadius: 10, borderWidth: 2, borderColor: L.ink, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 14, fontWeight: '800', color: L.ink },
  methodSub: { fontSize: 11, fontWeight: '500', color: L.sub, marginTop: 1 },
  errPanel: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 2, borderColor: L.error, backgroundColor: '#FFF0EE' },
  errPanelTitle: { fontSize: 13, fontWeight: '800', color: L.error },
  errPanelMsg: { fontSize: 12.5, color: '#7A2C22', marginTop: 4, lineHeight: 18 },
  avaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  avaSlot: { width: '17%', aspectRatio: 1, borderRadius: 14, padding: 2 },
  avaSlotOn: { borderWidth: 3, borderColor: L.ink },
  avaFill: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bidBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 16, borderRadius: 14, borderWidth: 3, borderColor: L.ink, backgroundColor: '#fff', justifyContent: 'center' },
  bidHash: { fontSize: 20, fontWeight: '900', color: L.faint },
  bidVal: { fontSize: 17, fontWeight: '800', color: L.ink, letterSpacing: 2 },
  warnBox: { marginTop: 12, backgroundColor: L.warnBg, borderWidth: 2, borderColor: L.ink, borderRadius: 10, padding: 13 },
  warnText: { fontSize: 12.5, fontWeight: '600', color: L.sub, lineHeight: 18 },
});

export const shell = StyleSheet.create({
  root: { flex: 1, backgroundColor: L.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: L.ink, fontSize: 16, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  emptySub: { color: L.sub, fontSize: 13, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerBack: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: L.ink },
});
