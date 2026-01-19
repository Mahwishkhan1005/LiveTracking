// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { Stack, router } from "expo-router";
import React, { useEffect } from "react";
import { CartProvider } from "../context/CartContext";

/**
 * REQUIRED: Notification behavior (Android)
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // 1️⃣ Request notification permission
    const requestPermissions = async () => {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permission not granted");
        return;
      }

      console.log("Notification permission granted");
    };

    requestPermissions();

    // 2️⃣ Handle notification tap (navigation)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          link?: string;
          orderId?: number;
        };

        if (data?.link) {
          router.push(data.link);
        }
      });

    // 3️⃣ Cleanup listeners
    return () => {
      responseListener.remove();
    };
  }, []);

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </CartProvider>
  );
}
