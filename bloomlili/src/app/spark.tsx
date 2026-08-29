// app/spark.tsx — real separate route. StripeProvider still wraps ONLY
// this screen (via SparkGate below), not the whole app — that isolation is
// what fixes the "Spark breaks everything" bug, and stays true here
// regardless of overlay-vs-route, so it's kept exactly as before.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StripeProvider, CardField, useStripe } from '@stripe/stripe-react-native';
import { useBloomAuth } from '../lib/AuthContext';
import { fbAuth, L, apiPost, fetchStripePk, SPARK_PLANS, money, type SparkPlan } from '../lib/bloomlili';
import { ScreenHeader, BackButton, NBButton, nb } from '../lib/ui';

function SparkContent({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [plan, setPlan] = useState<SparkPlan | null>(null);
  const { confirmSetupIntent } = useStripe();
  const [cardComplete, setCardComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = useCallback(async () => {
    if (!plan || !cardComplete || !fbAuth) return;
    setSubmitting(true); setError(null);
    try {
      const intentRes = await apiPost(fbAuth, '/api/stripe/payment-intent', { type: 'subscription', plan: plan.id });
      const clientSecret = intentRes.clientSecret as string | undefined;
      if (!clientSecret) throw new Error('Server did not return a client secret.');

      const { setupIntent, error: stripeErr } = await confirmSetupIntent(clientSecret, { paymentMethodType: 'Card', paymentMethodData: {} });
      if (stripeErr) throw new Error(stripeErr.message);
      if (!setupIntent) throw new Error('Card confirmation did not complete.');

      await apiPost(fbAuth, '/api/stripe/activate', { setupIntentId: setupIntent.id, type: 'subscription', plan: plan.id });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [plan, cardComplete, confirmSetupIntent]);

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: L.bg }}>
        <ScreenHeader title="Spark" onBack={onDone} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🎉</Text>
          <Text style={nb.stepTitle}>{plan?.name} activated!</Text>
          <View style={{ marginTop: 20, width: '100%' }}><NBButton label="Done" onPress={onDone} /></View>
        </View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: L.bg }}>
        <ScreenHeader title="Spark" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={nb.stepSub}>Pick a plan to unlock more of Bloomlili.</Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            {SPARK_PLANS.map((pl) => (
              <Pressable key={pl.id} onPress={() => setPlan(pl)} style={({ pressed }) => [s.planCard, pressed && nb.btnPressed]}>
                <View style={{ flex: 1 }}><Text style={s.planName}>{pl.name}</Text><Text style={s.planTagline}>{pl.tagline}</Text></View>
                <Text style={s.planPrice}>${money(pl.cents)}/mo</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: L.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Complete Payment" onBack={() => setPlan(null)} />
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={s.summaryCard}>
          <Text style={s.planName}>{plan.name}</Text>
          <Text style={s.planTagline}>Recurring monthly · Cancel anytime</Text>
          <Text style={s.bigPrice}><Text style={{ fontSize: 16 }}>$</Text>{money(plan.cents)}<Text style={{ fontSize: 14, fontWeight: '700' }}>/mo</Text></Text>
        </View>
        <Text style={[nb.label, { marginTop: 18 }]}>Card details</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{ number: '4242 4242 4242 4242' }}
          cardStyle={{ backgroundColor: '#FFFFFF', textColor: L.ink, borderWidth: 3, borderColor: L.ink, borderRadius: 14, fontSize: 15, placeholderColor: L.faint }}
          style={{ width: '100%', height: 50, marginTop: 6 }}
          onCardChange={(details) => setCardComplete(details.complete)}
        />
        {error && (<View style={nb.errPanel}><Text style={nb.errPanelTitle}>Payment Failed</Text><Text style={nb.errPanelMsg}>{error}</Text></View>)}
        <View style={{ marginTop: 18 }}><NBButton label={error ? 'Try again' : `Pay $${money(plan.cents)}/mo`} onPress={submit} disabled={!cardComplete} loading={submitting} /></View>
        <Text style={s.lockNote}>🔒 Secured by Stripe · Card data never touches our servers</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function SparkScreen() {
  const router = useRouter();
  const [pk, setPk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStripePk().then((key) => { if (!cancelled) setPk(key); }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load Stripe config.'); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: L.bg }}>
        <ScreenHeader title="Spark" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={nb.stepTitle}>Could not open Spark right now</Text>
          <Text style={[nb.stepSub, { textAlign: 'center', marginTop: 8 }]}>{error}</Text>
        </View>
      </View>
    );
  }
  if (!pk) {
    return (
      <View style={{ flex: 1, backgroundColor: L.bg }}>
        <ScreenHeader title="Spark" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={L.limeDk} size="large" /></View>
      </View>
    );
  }
  return (
    <StripeProvider publishableKey={pk} urlScheme="bloomlili">
      <SparkContent onDone={() => router.back()} />
    </StripeProvider>
  );
}

const s = StyleSheet.create({
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 3, borderColor: L.ink, backgroundColor: '#fff' },
  planName: { fontSize: 15, fontWeight: '800', color: L.ink },
  planTagline: { fontSize: 12, color: L.sub, marginTop: 2, fontWeight: '500' },
  planPrice: { fontSize: 14, fontWeight: '900', color: L.ink },
  summaryCard: { padding: 18, borderRadius: 16, borderWidth: 3, borderColor: L.ink, backgroundColor: '#fff' },
  bigPrice: { fontSize: 32, fontWeight: '900', color: L.ink, marginTop: 8 },
  lockNote: { textAlign: 'center', fontSize: 11, color: L.sub, marginTop: 14, fontWeight: '500' },
});
