// app/(tabs)/chat.tsx — Chat list

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useBloomAuth } from '../../lib/AuthContext';
import { fbDb, L, loadDms, type DmDoc, type ParticipantData } from '../../lib/bloomlili';
import { AvatarBubble, PlusIcon, ChevronRight, nb, shell } from '../../lib/ui';

export default function ChatTab() {
  const { profile } = useBloomAuth();
  const router = useRouter();
  const [dms, setDms] = useState<DmDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!fbDb) return;
    try { setDms(await loadDms(fbDb, profile.uid)); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load messages.'); }
  }, [profile.uid]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!dms) return [];
    const seen = new Set<string>();
    const out: { dm: DmDoc; other: ParticipantData }[] = [];
    for (const dm of dms) {
      const otherUid = dm.participants?.find((u) => u !== profile.uid);
      if (!otherUid || seen.has(otherUid)) continue;
      seen.add(otherUid);
      const other = dm.participantData?.[otherUid];
      if (other) out.push({ dm, other });
    }
    return out;
  }, [dms, profile.uid]);

  const openThread = (dm: DmDoc, other: ParticipantData) => {
    router.push({ pathname: '/chat/[dmId]', params: { dmId: dm.id, name: other.displayName, avatarIdx: String(other.avatarIdx), avatarUrl: other.avatarUrl ?? '' } });
  };

  return (
    <View style={shell.root}>
      <View style={s.listHeader}>
        <Text style={s.title}>Messages</Text>
        <Pressable onPress={() => router.push('/chat/new')} style={s.newBtn}><PlusIcon color={L.ink} /></Pressable>
      </View>

      {dms === null && !error && <ActivityIndicator style={{ marginTop: 30 }} color={L.limeDk} />}
      {!!error && <Text style={[nb.errText, { textAlign: 'center', marginTop: 20 }]}>{error}</Text>}
      {dms !== null && rows.length === 0 && !error && (
        <View style={shell.center}><Text style={shell.emptyTitle}>No DMs yet</Text><Text style={shell.emptySub}>Find someone and start a direct message.</Text></View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(row) => row.dm.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => openThread(item.dm, item.other)} style={({ pressed }) => [s.dmRow, pressed && nb.btnPressed]}>
            <AvatarBubble avatarIdx={item.other.avatarIdx} avatarUrl={item.other.avatarUrl} size={46} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.dmName}>{item.other.displayName}</Text>
              <Text style={s.dmSub}>#{item.other.bloomId}</Text>
            </View>
            <ChevronRight />
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14 },
  title: { fontSize: 20, fontWeight: '900', color: L.ink },
  newBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: L.ink, backgroundColor: L.lime, alignItems: 'center', justifyContent: 'center' },
  dmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  dmName: { fontSize: 14.5, fontWeight: '800', color: L.ink },
  dmSub: { fontSize: 11.5, color: L.faint, fontWeight: '600', marginTop: 2 },
});
