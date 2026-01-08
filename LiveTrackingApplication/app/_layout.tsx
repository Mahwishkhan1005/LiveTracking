// app/_layout.tsx
import { Stack } from 'expo-router';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false}}>
      <Stack.Screen name="index" />
      {/* You don't strictly need to list every screen if they are in the 'app' folder, 
        but ensure the Stack doesn't have restrictive options.
      */}
    </Stack>
  );
}