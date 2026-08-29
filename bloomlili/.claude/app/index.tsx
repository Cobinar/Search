import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthUser } from '@/auth/useAuthUser';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { user, initializing } = useAuthUser();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)/inbox/inbox' : '/sign-in'} />;
}
