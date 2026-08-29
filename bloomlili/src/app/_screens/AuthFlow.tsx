// app/_screens/AuthFlow.tsx — rendered directly by _layout.tsx, not a route
// (the whole point of the _screens/ underscore prefix is that Expo Router
// ignores it — this only ever shows conditionally, never via navigation).

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import {
  signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, type Auth,
} from 'firebase/auth';
import { EMAIL_ERR, ANON_ERR, errMessage } from '../../lib/bloomlili';
import { NBButton, NBInput, MailIcon, GuestIcon, BackButton, nb } from '../../lib/ui';

type MethodStep = 'methods' | 'email';

function MethodButton({ label, sub, onPress, icon }: { label: string; sub: string; onPress: () => void; icon: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [nb.methodBtn, pressed && nb.btnPressed]}>
      <View style={nb.methodIco}>{icon}</View>
      <View style={{ flex: 1 }}><Text style={nb.methodLabel}>{label}</Text><Text style={nb.methodSub}>{sub}</Text></View>
    </Pressable>
  );
}

export default function AuthFlow({ auth }: { auth: Auth }) {
  const [step, setStep] = useState<MethodStep>('methods');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [fieldErr, setFieldErr] = useState<{ email?: string; pw?: string; pw2?: string }>({});
  const [busy, setBusy] = useState(false);
  const [authErr, setAuthErr] = useState<{ title: string; msg: string } | null>(null);

  const doAnon = useCallback(async () => {
    setBusy(true); setAuthErr(null);
    try { await signInAnonymously(auth); } catch (err) {
      setBusy(false);
      setAuthErr({ title: 'Anonymous Sign-In Failed', msg: errMessage(ANON_ERR, err) });
    }
  }, [auth]);

  const doEmail = useCallback(async () => {
    const errs: typeof fieldErr = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email.';
    if (pw.length < 6) errs.pw = 'Password must be at least 6 characters.';
    if (emailMode === 'signup' && pw !== pw2) errs.pw2 = 'Passwords do not match.';
    setFieldErr(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setAuthErr(null);
    try {
      if (emailMode === 'signup') await createUserWithEmailAndPassword(auth, email, pw);
      else await signInWithEmailAndPassword(auth, email, pw);
    } catch (err) {
      setBusy(false);
      setAuthErr({ title: emailMode === 'signin' ? 'Sign In Failed' : 'Account Creation Failed', msg: errMessage(EMAIL_ERR, err) });
    }
  }, [auth, email, pw, pw2, emailMode]);

  if (step === 'methods') {
    return (
      <ScrollView contentContainerStyle={nb.screenPad}>
        <Text style={nb.stepTitle}>Welcome Back</Text>
        <Text style={nb.stepSub}>Choose how to sign in or create an account.</Text>
        <View style={{ marginTop: 18, gap: 10 }}>
          <MethodButton label="Email & Password" sub="Sign in or create with email" icon={<MailIcon />} onPress={() => setStep('email')} />
          <MethodButton label="Guest / Anonymous" sub="No account needed" icon={<GuestIcon />} onPress={doAnon} />
        </View>
        {busy && <ActivityIndicator style={{ marginTop: 16 }} />}
        {authErr && (<View style={nb.errPanel}><Text style={nb.errPanelTitle}>{authErr.title}</Text><Text style={nb.errPanelMsg}>{authErr.msg}</Text></View>)}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={nb.screenPad} keyboardShouldPersistTaps="handled">
        <BackButton onPress={() => setStep('methods')} />
        <View style={nb.authToggle}>
          <Pressable style={[nb.atBtn, emailMode === 'signin' && nb.atBtnOn]} onPress={() => setEmailMode('signin')}><Text style={nb.atBtnText}>Sign In</Text></Pressable>
          <Pressable style={[nb.atBtn, emailMode === 'signup' && nb.atBtnOn]} onPress={() => setEmailMode('signup')}><Text style={nb.atBtnText}>Sign Up</Text></Pressable>
        </View>
        <Text style={nb.label}>Email address</Text>
        <NBInput value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} errorText={fieldErr.email} />
        <Text style={[nb.label, { marginTop: 10 }]}>Password</Text>
        <View style={{ position: 'relative' }}>
          <NBInput value={pw} onChangeText={setPw} placeholder="Min 6 characters" secureTextEntry={!pwVisible} style={{ paddingRight: 44 }} errorText={fieldErr.pw} />
          <Pressable style={{ position: 'absolute', right: 10, top: 21 }} onPress={() => setPwVisible((v) => !v)} hitSlop={8}>
            <Text style={{ fontSize: 12, fontWeight: '700' }}>{pwVisible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        </View>
        {emailMode === 'signup' && (<><Text style={[nb.label, { marginTop: 10 }]}>Confirm Password</Text><NBInput value={pw2} onChangeText={setPw2} placeholder="Repeat password" secureTextEntry={!pwVisible} errorText={fieldErr.pw2} /></>)}
        <View style={{ marginTop: 14 }}><NBButton label={emailMode === 'signin' ? 'Sign In' : 'Create Account'} onPress={doEmail} loading={busy} /></View>
        {authErr && (<View style={nb.errPanel}><Text style={nb.errPanelTitle}>{authErr.title}</Text><Text style={nb.errPanelMsg}>{authErr.msg}</Text></View>)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
