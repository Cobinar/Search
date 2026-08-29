// app/(tabs)/profile.tsx — Profile: fixed field names (url/type, not
// mediaUrl/mediaType — the actual "count right, grid blank" bug), plus real
// avatar photo import through the real /api/upload → R2 endpoint.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Dimensions, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useBloomAuth } from '../../lib/AuthContext';
import {
  fbAuth, fbDb, L, uploadMedia, saveProfileEdits, fetchProfileCounts, fetchOwnFeedPosts, type FeedPost,
} from '../../lib/bloomlili';
import {
  AvatarBubble, AvatarGrid, NBButton, NBInput, BackButton, EditIcon, CameraIcon,
  SettingsIcon, SparkIcon, EmptyGridIcon, PlayBadgeIcon, nb, shell,
} from '../../lib/ui';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ProfileTab() {
  const { profile, setProfile } = useBloomAuth();
  const router = useRouter();
  const [counts, setCounts] = useState<{ followers: number; following: number; posts: number } | null>(null);
  const [countsErr, setCountsErr] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile.displayName);
  const [editAva, setEditAva] = useState(profile.avatarIdx);
  const [editAvaUrl, setEditAvaUrl] = useState(profile.avatarUrl);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!fbDb) return;
      try {
        const [c, p] = await Promise.all([fetchProfileCounts(fbDb, profile.uid), fetchOwnFeedPosts(fbDb, profile.uid)]);
        if (cancelled) return;
        setCounts(c); setPosts(p);
      } catch (err) {
        if (!cancelled) setCountsErr(err instanceof Error ? err.message : 'Could not load your profile data.');
      }
    })();
    return () => { cancelled = true; };
  }, [profile.uid]);

  const startEdit = useCallback(() => {
    setEditName(profile.displayName); setEditAva(profile.avatarIdx); setEditAvaUrl(profile.avatarUrl);
    setNameErr(null); setEditing(true);
  }, [profile]);

  const pickPhoto = useCallback(async () => {
    setPhotoErr(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setPhotoErr('Photo library access is needed to set a profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, aspect: [1, 1], allowsEditing: true });
    if (result.canceled || !result.assets?.[0]) return;
    setUploadingPhoto(true);
    try {
      if (!fbAuth) throw new Error('Not signed in.');
      const url = await uploadMedia(fbAuth, result.assets[0].uri, { collection: 'users', entityId: profile.uid, slot: 'image', isAvatarRule: true });
      setEditAvaUrl(url);
    } catch (err) {
      setPhotoErr(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [profile.uid]);

  const saveEdit = useCallback(async () => {
    const v = editName.trim();
    if (v.length < 2 || v.length > 32) { setNameErr('Name must be 2–32 characters.'); return; }
    if (!fbDb) return;
    setSaving(true);
    try {
      await saveProfileEdits(fbDb, profile.uid, { displayName: v, avatarIdx: editAva, avatarUrl: editAvaUrl });
      setProfile({ ...profile, displayName: v, avatarIdx: editAva, avatarUrl: editAvaUrl });
      setEditing(false);
    } catch (err) {
      setNameErr(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }, [profile, editName, editAva, editAvaUrl, setProfile]);

  if (editing) {
    return (
      <KeyboardAvoidingView style={shell.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={nb.screenPad} keyboardShouldPersistTaps="handled">
          <BackButton onPress={() => setEditing(false)} />
          <Text style={nb.stepTitle}>Edit Profile</Text>

          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Pressable onPress={pickPhoto} style={{ position: 'relative' }}>
              <AvatarBubble avatarIdx={editAva} avatarUrl={editAvaUrl} size={88} />
              <View style={p.photoBadge}>{uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <CameraIcon color="#fff" />}</View>
            </Pressable>
            {editAvaUrl && (
              <Pressable onPress={() => setEditAvaUrl(null)}><Text style={p.removePhoto}>Remove photo, use preset instead</Text></Pressable>
            )}
            {!!photoErr && <Text style={nb.errText}>{photoErr}</Text>}
          </View>

          <Text style={[nb.label, { marginTop: 20 }]}>Display name</Text>
          <NBInput value={editName} onChangeText={setEditName} placeholder="e.g. Marc" maxLength={32} errorText={nameErr} />

          {!editAvaUrl && (
            <>
              <Text style={[nb.label, { marginTop: 14 }]}>Or pick a preset avatar</Text>
              <AvatarGrid value={editAva} onChange={setEditAva} />
            </>
          )}

          <View style={{ marginTop: 16 }}><NBButton label="Save" onPress={saveEdit} loading={saving} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const gridSize = (SCREEN_W - 4) / 3;

  return (
    <ScrollView contentContainerStyle={p.pad} style={shell.root}>
      <View style={p.header}>
        <Pressable onPress={() => router.push('/settings')} style={p.settingsBtn} hitSlop={8}><SettingsIcon /></Pressable>
        <AvatarBubble avatarIdx={profile.avatarIdx} avatarUrl={profile.avatarUrl} size={88} />
        <Text style={p.name}>{profile.displayName}</Text>
        <Text style={p.bid}>#{profile.bloomId}</Text>
        <View style={p.statsRow}>
          <View style={p.stat}><Text style={p.statN}>{counts ? counts.followers : '—'}</Text><Text style={p.statL}>Followers</Text></View>
          <View style={p.stat}><Text style={p.statN}>{counts ? counts.posts : '—'}</Text><Text style={p.statL}>Posts</Text></View>
          <View style={p.stat}><Text style={p.statN}>{counts ? counts.following : '—'}</Text><Text style={p.statL}>Following</Text></View>
        </View>
        {!!countsErr && <Text style={nb.errText}>{countsErr}</Text>}
        <View style={p.actionsRow}>
          <Pressable onPress={startEdit} style={({ pressed }) => [p.actionBtn, pressed && nb.btnPressed]}><EditIcon /><Text style={p.actionText}>Edit Profile</Text></Pressable>
          <Pressable onPress={() => router.push('/spark')} style={({ pressed }) => [p.actionBtn, p.actionBtnSpark, pressed && nb.btnPressed]}><SparkIcon /><Text style={p.actionText}>Get Spark</Text></Pressable>
        </View>
      </View>

      {posts === null ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={L.limeDk} />
      ) : posts.length === 0 ? (
        <View style={p.grid}><EmptyGridIcon /><Text style={p.emptyGridText}>No posts yet</Text></View>
      ) : (
        <View style={p.gridWrap}>
          {posts.map((post) => (
            <View key={post.id} style={{ width: gridSize, height: gridSize }}>
              {post.url ? <Image source={{ uri: post.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <View style={[{ width: '100%', height: '100%' }, p.gridPlaceholder]} />}
              {post.type === 'video' && <View style={p.gridPlayBadge}><PlayBadgeIcon /></View>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const p = StyleSheet.create({
  pad: { flexGrow: 1, paddingBottom: 120 },
  header: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 24, paddingBottom: 20 },
  settingsBtn: { position: 'absolute', top: 60, right: 20, width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: L.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  photoBadge: { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: L.ink, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  removePhoto: { fontSize: 11.5, color: L.sub, fontWeight: '600', marginTop: 8, textDecorationLine: 'underline' },
  name: { fontSize: 19, fontWeight: '900', color: L.ink, marginTop: 12 },
  bid: { fontSize: 12, fontWeight: '700', color: L.faint, marginTop: 3, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 28, marginTop: 18 },
  stat: { alignItems: 'center' },
  statN: { fontSize: 16, fontWeight: '900', color: L.ink },
  statL: { fontSize: 10.5, fontWeight: '700', color: L.sub, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 2, borderColor: L.ink, backgroundColor: '#fff' },
  actionBtnSpark: { backgroundColor: L.lime },
  actionText: { fontSize: 12.5, fontWeight: '800', color: L.ink },
  grid: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyGridText: { fontSize: 12.5, color: L.sub, marginTop: 8, fontWeight: '600' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  gridPlaceholder: { backgroundColor: '#F2F2F2' },
  gridPlayBadge: { position: 'absolute', top: 6, right: 6 },
});
