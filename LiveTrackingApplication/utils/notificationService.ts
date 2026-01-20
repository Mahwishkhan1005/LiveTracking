import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import RNEventSource from "react-native-sse";

// UPDATED IP FOR NOTIFICATIONS
const BASE_URL = "http://192.168.0.213:8081";

/**
 * Fetch all notifications
 */
export const getNotifications = async () => {
  const token =
    Platform.OS === "web"
      ? await AsyncStorage.getItem("userToken")
      : await SecureStore.getItemAsync("userToken");

  const response = await axios.get(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

/**
 * Fetch unread notification count
 */
export const getUnreadCount = async () => {
  const token =
    Platform.OS === "web"
      ? await AsyncStorage.getItem("userToken")
      : await SecureStore.getItemAsync("userToken");

  const response = await axios.get(
    `${BASE_URL}/api/notifications/unread-count`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return response.data;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (id: string) => {
  const token =
    Platform.OS === "web"
      ? await AsyncStorage.getItem("userToken")
      : await SecureStore.getItemAsync("userToken");

  await axios.patch(
    `${BASE_URL}/api/notifications/${id}/read`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
};

/**
 * SSE Notification Setup
 */
export const setupSSENotifications = async (userId: string) => {
  const token =
    Platform.OS === "web"
      ? await AsyncStorage.getItem("userToken")
      : await SecureStore.getItemAsync("userToken");

  const eventSource = new RNEventSource(
    `${BASE_URL}/api/notifications/subscribe`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  eventSource.addEventListener("open" as any, () => {
    console.log("SSE connected for user:", userId);
  });

  eventSource.addEventListener("error" as any, (error: any) => {
    console.error("SSE error:", error);
  });

  // UPDATED STATUS MAP
  const titleMap: Record<string, string> = {
    ORDER_PLACED: "📦 Order Placed",
    RIDER_ASSIGNED: "🚴 Rider Assigned",
    RIDER_REQUEST: "🔍 Finding Rider",
    PICKED_UP: "🥡 Order Picked Up",
    OUT_FOR_DELIVERY: "🚚 Out for Delivery",
    REACHED_DESTINATION: "📍 Reached Destination",
    DELIVERED: "✅ Delivered",
    RIDER_EXPIRED: "⚠️ Rider Request Expired",
  };

  const eventTypes = Object.keys(titleMap);

  eventTypes.forEach((type) => {
    eventSource.addEventListener(type as any, (event: any) => {
      try {
        const data = JSON.parse(event.data || "{}");

        showLocalNotification(
          titleMap[type],
          data.message || "Status updated",
          {
            senderId: data.senderId,
            link: data.link,
            orderId: data.orderId,
          },
        );
      } catch (e) {
        console.error(`${type} parse error`, e);
      }
    });
  });

  return () => {
    console.log("SSE connection closed");
    eventSource.close();
  };
};

async function showLocalNotification(
  title: string,
  body: string,
  extraData: {
    senderId?: string;
    link?: string;
    orderId?: number;
  },
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: `From: ${extraData.senderId}\n${body}`,
      sound: true,
      data: {
        link: extraData.link,
        orderId: extraData.orderId,
      },
    },
    trigger: null,
  });
}
