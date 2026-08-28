import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { HardShadowBox, NeoButton, Icon } from '@/components';
import { useAuthUser } from '@/auth';
import { colors } from '@/theme';

export default function SignIn() {
  const router = useRouter();
  const { user } = useAuthUser();

  useEffect(() => {
    if (user) router.replace('/inbox/inbox');
  }, [user]);

  return (
    <View style={styles.page}>
      <HardShadowBox offset={10} style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Icon name="all" size={24} color={colors.white} />
          </View>
          <View>
            <Text style={styles.brandName}>Cobinar Mail</Text>
            <Text style={styles.brandSub}>mail.cobinar.com</Text>
          </View>
        </View>

        <Text style={styles.heading}>Sign in to your inbox</Text>
        <Text style={styles.subheading}>
          Use your Cobinar account to access your inbox. Your Cobinar email address is your mail address here.
        </Text>

        <NeoButton onPress={() => router.push('/auth-callback?provider=cobinar')} style={styles.signInBtn}>
          <Icon name="all" size={18} color={colors.orange} />
          <Text style={styles.signInText}>Sign in with Cobinar</Text>
        </NeoButton>

        <Text style={styles.orLabel}>while testing</Text>

        <NeoButton onPress={() => router.push('/auth-callback?provider=google')} style={styles.signInBtn}>
          <Text style={styles.signInText}>Continue with Google</Text>
        </NeoButton>

        <Text style={styles.footnote}>Your sign-in email becomes your mailbox address.</Text>
      </HardShadowBox>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: colors.bg, borderWidth: 3, borderColor: colors.ink, padding: 32, gap: 20, alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  brandIcon: { width: 50, height: 50, backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 20, fontWeight: '700', color: colors.text },
  brandSub: { fontSize: 12, color: colors.orangeDark, fontWeight: '600' },
  heading: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: colors.text },
  subheading: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  signInBtn: { width: '100%' },
  signInText: { fontSize: 15, fontWeight: '700', color: colors.text },
  orLabel: { fontSize: 11, fontWeight: '700', color: colors.faint, letterSpacing: 0.5 },
  footnote: { fontSize: 11, color: colors.faint, textAlign: 'center' },
});
