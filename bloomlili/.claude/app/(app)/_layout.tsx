import React, { useEffect } from 'react';
import { View, Pressable, Dimensions, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { DrawerProvider, useDrawer } from '@/navigation/DrawerContext';
import { FolderDrawerContent } from '@/components/FolderDrawerContent';
import { useAuthUser } from '@/auth/useAuthUser';
import { useMessages } from '@/data/useMessages';
import { colors } from '@/theme/tokens';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);

function DrawerOverlay() {
  const { isOpen, close } = useDrawer();
  const router = useRouter();
  const { user } = useAuthUser();
  const { messages } = useMessages(user);
  const translateX = useSharedValue(-DRAWER_WIDTH);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -DRAWER_WIDTH, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [isOpen]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen ? 1 : 0, { duration: 220 }),
  }));

  return (
    <>
      {isOpen && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
      )}
      <Animated.View
        style={[styles.drawer, { width: DRAWER_WIDTH }, drawerStyle]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <FolderDrawerContent
          messages={messages}
          activeFolder="inbox"
          onNavigate={(folder) => {
            close();
            router.push(`/(app)/inbox/${folder}`);
          }}
          onCompose={() => {
            close();
            router.push('/(app)/compose');
          }}
        />
      </Animated.View>
    </>
  );
}

export default function AppLayout() {
  const { user, initializing } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) router.replace('/sign-in');
  }, [user, initializing]);

  return (
    <DrawerProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="inbox/[folder]" />
          <Stack.Screen name="message/[id]" />
          <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        </Stack>
        <DrawerOverlay />
      </View>
    </DrawerProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(22,23,28,0.45)', zIndex: 140 },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 150,
    borderRightWidth: 3, borderRightColor: colors.ink,
  },
});
