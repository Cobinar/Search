// app/(tabs)/alerts.tsx — honest placeholder, not guessing at a notification
// schema I haven't verified against real data, same reasoning as before.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BellOffIcon, shell } from '../../lib/ui';

export default function AlertsTab() {
  return (
    <View style={shell.root}>
      <View style={styles.header}><Text style={styles.title}>Alerts</Text></View>
      <View style={shell.center}>
        <BellOffIcon />
        <Text style={[shell.emptyTitle, { marginTop: 12 }]}>Not built yet</Text>
        <Text style={shell.emptySub}>Coming once the real notification schema is verified — same rule as everything else here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 6 },
  title: { fontSize: 20, fontWeight: '900', color: '#111' },
});
