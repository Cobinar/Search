// app/chat/[dmId].tsx — real-time message thread, dynamic route

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useBloomAuth } from '../../lib/AuthContext';
import { fbDb, L, sendDmMessage, setTyping, type MessageDoc } from '../../lib/bloomlili';
import { AvatarBubble, BackChevron, SendIcon } from '../../lib/ui';

export default function ChatThreadScreen() {
  const { dmId, name, avatarIdx, avatarUrl } = useLocalSearchParams<{ dmId: string; name: string; avatarIdx: string; avatarUrl: string }>();
  const { profile } = useBloomAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<MessageDoc>>(null);

  useEffect(() => {
    if (!fbDb || !dmId) return;
    const q = query(collection(fbDb, 'dms', dmId, 'messages'), orderBy('createdAt', 'asc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MessageDoc, 'id'>) })));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, (err) => console.warn('[Bloomlili] message listener error (non-fatal):', err));
    return unsub;
  }, [dmId]);

  useEffect(() => {
    if (!fbDb || !dmId) return;
    const unsub = onSnapshot(collection(fbDb, 'dms', dmId, 'typing'), (snap) => {
      const names: string[] = [];
      snap.forEach((d) => { if (d.id !== profile.uid) names.push((d.data() as { displayName: string }).displayName); });
      setTypingNames(names);
    }, (err) => console.warn('[Bloomlili] typing listener error (non-fatal):', err));
    return () => {
      unsub();
      if (fbDb) setTyping(fbDb, dmId, profile, false);
    };
  }, [dmId, profile]);

  const handleChangeText = useCallback((t: string) => {
    setText(t);
    if (!fbDb || !dmId) return;
    setTyping(fbDb, dmId, profile, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { if (fbDb) setTyping(fbDb, dmId, profile, false); }, 2500);
  }, [dmId, profile]);

  const send = useCallback(async () => {
    const v = text.trim();
    if (!v || sending || !fbDb || !dmId) return;
    setSending(true);
    setText('');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    setTyping(fbDb, dmId, profile, false);
    try {
      await sendDmMessage(fbDb, dmId, profile, v);
    } catch (err) {
      console.warn('[Bloomlili] send failed:', err);
      setText(v);
    } finally {
      setSending(false);
    }
  }, [dmId, profile, text, sending]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: L.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 4 }}><BackChevron /></Pressable>
        <AvatarBubble avatarIdx={Number(avatarIdx) || 0} avatarUrl={avatarUrl || null} size={34} />
        <Text style={s.name}>{name}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => {
          if (item.type === 'system') return <Text style={s.systemMsg}>{item.text ?? item._t}</Text>;
          const mine = item.senderId === profile.uid;
          return (
            <View style={[s.bubbleRow, mine && s.bubbleRowMine]}>
              <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                <Text style={s.bubbleText}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />

      {typingNames.length > 0 && (
        <Text style={s.typingText}>{typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…</Text>
      )}

      <View style={s.inputRow}>
        <TextInput value={text} onChangeText={handleChangeText} placeholder="Message…" placeholderTextColor={L.faint} style={s.input} multiline />
        <Pressable onPress={send} disabled={!text.trim() || sending} style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}>
          <SendIcon />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  name: { fontSize: 15, fontWeight: '800', color: L.ink },
  systemMsg: { textAlign: 'center', fontSize: 11.5, color: L.faint, fontWeight: '600', marginVertical: 6 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 2, borderColor: L.ink },
  bubbleTheirs: { backgroundColor: '#fff' },
  bubbleMine: { backgroundColor: L.lime },
  bubbleText: { fontSize: 14, color: L.ink, fontWeight: '500' },
  typingText: { fontSize: 11.5, color: L.sub, fontWeight: '600', paddingHorizontal: 16, paddingBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#EEE' },
  input: { flex: 1, borderWidth: 2, borderColor: L.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: L.ink, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: L.lime, borderWidth: 2, borderColor: L.ink, alignItems: 'center', justifyContent: 'center' },
});
