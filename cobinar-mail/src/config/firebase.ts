import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { secureAsyncStorage } from '@/security';

/**
 * Same Firebase project as webmail/index.html — this is one mailbox
 * system with two clients, not a separate backend.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAABGe5EcQfFcimjiaVUGhixRJNDT37z0Q',
  authDomain: 'cobinar-mail.firebaseapp.com',
  projectId: 'cobinar-mail',
  storageBucket: 'cobinar-mail.firebasestorage.app',
  messagingSenderId: '434008255399',
  appId: '1:434008255399:web:b4b3833d81435075e4a482',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// On native, back auth persistence with the chunked SecureStore adapter
// (Keychain/Keystore) instead of plain AsyncStorage — see
// src/security.ts for exactly what that buys you and why it needs
// chunking. On web (if this app is ever run via `expo start --web`),
// fall back to the standard web SDK, which handles its own persistence.
let authInstance: Auth;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getAuth } = require('firebase/auth');
  authInstance = getAuth(app);
} else {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(secureAsyncStorage),
  });
}
export const auth = authInstance;

// Same long-polling auto-detection as webmail/index.html — some mobile
// networks hit the same QUIC/WebChannel resets as some browsers do.
export const db = Platform.OS === 'web'
  ? getFirestore(app)
  : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
