import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthUser } from '@/auth';
import { colors } from '@/theme';

export default function Index() {
  const { user, initializing } = useAuthUser();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  // NOTE: route groups like (app) never appear in the actual path — a
  // file at app/(app)/inbox/[folder]/index.tsx resolves to /inbox/[folder],
  // not /(app)/inbox/[folder]. Every navigation call in this app uses the
  // group-free form for exactly this reason.
  return <Redirect href={user ? '/inbox/inbox' : '/sign-in'} />;
}
