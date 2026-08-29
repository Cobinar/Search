// app/(tabs)/index.tsx — Home

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useBloomAuth } from '../../lib/AuthContext';
import { fbAuth, fbDb, L, createStatus, fetchOwnStatus, type StatusDoc } from '../../lib/bloomlili';
import { AvatarBubble, PlusIcon, CloseIcon, shell, nb } from '../../lib/ui';

function StatusRing({ hasActive, busy, error, onPress }: { hasActive: boolean; busy: boolean; error: string | null; onPress: () => void }) {
  const { profile } = useBloomAuth();
  return (
    <View style={s.ringRow}>
      <Pressable onPress={onPress} style={{ position: 'relative' }}>
        <LinearGradient colors={hasActive ? [L.lime, L.limeDk] : ['#EEE', '#EEE']} style={s.ring}>
          <View style={s.ringInner}><AvatarBubble avatarIdx={profile.avatarIdx} avatarUrl={profile.avatarUrl} size={52} /></View>
        </LinearGradient>
        {!hasActive && <View style={s.plusBadge}>{busy ? <ActivityIndicator size="small" color="#fff" /> : <PlusIcon />}</View>}
      </Pressable>
      <Text style={s.ringLabel}>{hasActive ? 'Your Status' : 'Add Status'}</Text>
      {!!error && <Text style={[nb.errText, { textAlign: 'center' }]}>{error}</Text>}
    </View>
  );
}

// Own status only — simple enough (no independent back-navigation needed)
// to stay as local overlay state in this one file, unlike Settings/Spark/
// Chat which each needed real separate routes.
function StatusViewer({ items, onClose }: { items: StatusDoc[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const current = items[index];
  const player = useVideoPlayer(current?.mediaType === 'video' ? current.mediaUrl : '', (p) => { p.loop = false; if (current?.mediaType === 'video') p.play(); });

  const advance = useCallback(() => {
    if (index < items.length - 1) setIndex((i) => i + 1); else onClose();
  }, [index, items.length, onClose]);

  useEffect(() => {
    if (current?.mediaType !== 'image') return;
    const t = setTimeout(advance, 5000);
    return () => clearTimeout(t);
  }, [current, advance]);

  if (!current) return null;
  return (
    <View style={s.viewerRoot}>
      <View style={s.progressRow}>
        {items.map((_, i) => (<View key={i} style={s.progressTrack}><View style={[s.progressFill, { width: i <= index ? '100%' : '0%' }]} /></View>))}
      </View>
      <Pressable onPress={onClose} style={s.viewerClose} hitSlop={10}><CloseIcon color="#fff" /></Pressable>
      <Pressable style={StyleSheet.absoluteFill} onPress={advance}>
        {current.mediaType === 'video' ? (
          <VideoView style={StyleSheet.absoluteFill} player={player} contentFit="contain" nativeControls={false} />
        ) : (
          <Image source={{ uri: current.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        )}
      </Pressable>
    </View>
  );
}

export default function HomeTab() {
  const { profile } = useBloomAuth();
  const [ownStatus, setOwnStatus] = useState<StatusDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);

  const refresh = useCallback(async () => {
    if (!fbDb) return;
    try { setOwnStatus(await fetchOwnStatus(fbDb, profile.uid)); } catch (err) { console.warn('[Bloomlili] status load failed (non-fatal):', err); }
  }, [profile.uid]);

  useEffect(() => { refresh(); }, [refresh]);

  const onStatusPress = useCallback(async () => {
    if (ownStatus.length > 0) { setViewing(true); return; }
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Photo library access is needed to post a Status.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mediaType: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
    setBusy(true);
    try {
      if (!fbAuth || !fbDb) throw new Error('Not connected.');
      await createStatus(fbAuth, fbDb, profile.uid, asset.uri, mediaType);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your Status.');
    } finally {
      setBusy(false);
    }
  }, [ownStatus.length, profile.uid, refresh]);

  if (viewing) return <StatusViewer items={ownStatus} onClose={() => setViewing(false)} />;

  return (
    <View style={shell.root}>
      <View style={s.header}><Text style={s.brand}>Bloomlili</Text></View>
      <StatusRing hasActive={ownStatus.length > 0} busy={busy} error={error} onPress={onStatusPress} />
      <View style={shell.center}>
        <Text style={s.emptyIco}>✦</Text>
        <Text style={shell.emptyTitle}>Nothing here yet</Text>
        <Text style={shell.emptySub}>Your feed will appear here.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 6 },
  brand: { color: L.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  emptyIco: { color: L.limeDk, fontSize: 28, marginBottom: 10, textAlign: 'center' },
  ringRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  ring: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  plusBadge: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: L.limeDk, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ringLabel: { fontSize: 10.5, fontWeight: '700', color: L.sub, marginTop: 6 },
  viewerRoot: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 600 },
  progressRow: { flexDirection: 'row', gap: 4, paddingTop: 54, paddingHorizontal: 10, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  progressTrack: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  viewerClose: { position: 'absolute', top: 66, right: 14, zIndex: 2, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
