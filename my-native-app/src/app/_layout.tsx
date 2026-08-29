import { Slot } from 'expo-router';

export default function RootLayout() {
  // <Slot /> tells Expo Router to render your screen exactly as it is,
  // completely raw, with no built-in headers or tab bars wrapping it.
  return <Slot />;
}