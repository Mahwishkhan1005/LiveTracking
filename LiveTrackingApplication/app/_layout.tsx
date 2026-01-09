// app/_layout.tsx
import { Stack } from 'expo-router';
import { CartProvider } from '../context/CartContext'; // Path from 'app' to 'context'

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </CartProvider>
  );
}