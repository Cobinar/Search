// ═══════════════════════════════════════════════════════════════════════════
//  app/(tabs)/_layout.tsx — Tabs navigator with the real custom bottom nav
//  Cobinar Systems · Marc-Arthur Samuel Dalus
//
//  This is the actual fix for the nav bar lifting during chat/settings, not
//  a CSS patch. Two separate things were happening before:
//   1. Settings/Spark/Chat-thread were full-screen <View> overlays stacked
//      via zIndex on top of the same tree the nav bar lived in — a
//      fundamentally fragile pattern for exactly this kind of bug. They're
//      now real Stack screens (app/settings.tsx, app/spark.tsx,
//      app/chat/[dmId].tsx) pushed via router.push(), so navigating to them
//      unmounts this whole Tabs subtree the way React Navigation is
//      designed to — no manual z-index management, nothing to fight with.
//   2. The keyboard opening in chat could shift an absolutely-positioned
//      nav bar depending on Android's window-resize behavior. Fixed
//      directly below with a Keyboard listener that hides the bar outright
//      while the keyboard is up, rather than trying to out-guess Android's
//      resize behavior with positioning tricks.
//
//  The center "Discover" button is a real button, not a 5th tab — it never
//  had its own screen/content, so it's handled as a non-navigating
//  tabBarButton override rather than a fake Tabs.Screen.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Keyboard, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { L } from '../../lib/bloomlili';
import { HomeIcon, ChatTabIcon, DiscoverIcon, BellIcon, ProfileTabIcon } from '../../lib/ui';

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvt = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const s1 = Keyboard.addListener(showEvt, () => setVisible(true));
    const s2 = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);
  return visible;
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  if (keyboardVisible) return null; // locked — nothing to lift if it isn't rendered

  const iconFor = (routeName: string, color: string) => {
    switch (routeName) {
      case 'index': return <HomeIcon color={color} />;
      case 'chat': return <ChatTabIcon color={color} />;
      case 'alerts': return <BellIcon color={color} />;
      case 'profile': return <ProfileTabIcon color={color} />;
      default: return null;
    }
  };
  const labelFor = (routeName: string) => {
    switch (routeName) {
      case 'index': return 'Home';
      case 'chat': return 'Chat';
      case 'alerts': return 'Alerts';
      case 'profile': return 'Me';
      default: return routeName;
    }
  };

  const renderTab = (route: BottomTabBarProps['state']['routes'][number], index: number) => {
    const focused = state.index === index;
    const color = focused ? L.ink : L.sub;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable key={route.key} onPress={onPress} accessibilityRole="button" accessibilityLabel={labelFor(route.name)} style={[bar.item, focused && bar.itemOn]}>
        <View style={bar.itemIco}>{iconFor(route.name, color)}</View>
        <Text style={[bar.itemLbl, { color }]}>{labelFor(route.name)}</Text>
      </Pressable>
    );
  };

  // Fixed 5-slot layout: Home, Chat, [orb], Alerts, Me — same arrangement
  // as the original design, just sourcing the 4 real tabs from state.routes
  // instead of hardcoding them, since the orb was never a real route.
  const home = state.routes.find((r) => r.name === 'index');
  const chat = state.routes.find((r) => r.name === 'chat');
  const alerts = state.routes.find((r) => r.name === 'alerts');
  const profile = state.routes.find((r) => r.name === 'profile');

  return (
    <View style={[bar.wrap, { bottom: 12 + insets.bottom }]}>
      <View style={bar.inner}>
        {home && renderTab(home, state.routes.indexOf(home))}
        {chat && renderTab(chat, state.routes.indexOf(chat))}
        <Pressable
          onPress={() => console.log('[Bloomlili] Discover pressed — wire up navigation here')}
          accessibilityRole="button"
          accessibilityLabel="Discover"
          style={bar.orbSlot}
        >
          <LinearGradient colors={[L.lime2, L.limeDk]} start={{ x: 0.15, y: 0.15 }} end={{ x: 0.85, y: 0.85 }} style={bar.orb}>
            <DiscoverIcon color={L.ink} />
          </LinearGradient>
          <Text style={[bar.itemLbl, { color: L.sub, marginTop: 3 }]}>Discover</Text>
        </Pressable>
        {alerts && renderTab(alerts, state.routes.indexOf(alerts))}
        {profile && renderTab(profile, state.routes.indexOf(profile))}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="alerts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const bar = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 12, right: 12, zIndex: 200,
    backgroundColor: '#fff', borderWidth: 2, borderColor: L.ink, borderRadius: 22, padding: 4,
    shadowColor: L.ink, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
    flexDirection: 'row',
  },
  inner: { flexDirection: 'row', alignItems: 'stretch', flex: 1, gap: 2 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 7, borderRadius: 16, minHeight: 52 },
  itemOn: { backgroundColor: L.lime2, borderWidth: 2, borderColor: L.ink },
  itemIco: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  itemLbl: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  orbSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  orb: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    shadowColor: L.lime, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
});
