import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import RNEventSource from "react-native-sse";

// Update this to match your backend IP
const BASE_URL = "http://192.168.0.232:8081";

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

  /**
   * 1. Generic Message Listener
   * Handles messages that include a redirect link
   */
  eventSource.addEventListener("message" as any, (event: any) => {
    try {
      const data = JSON.parse(event.data || "{}");
      if (data.link) {
        showLocalNotification(
          "New Update",
          data.message || "Tap to view details",
          {
            senderId: data.senderId,
            link: data.link,
            orderId: data.orderId,
          },
        );
      }
    } catch (e) {
      console.error("Generic message parse error", e);
    }
  });

  /**
   * 2. Specific Status Event Listeners
   */
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

/**
 * Schedules a local notification on the device
 */
async function showLocalNotification(
  title: string,
  body: string,
  extraData: {
    senderId?: string;
    link?: string;
    orderId?: number;
  },
) {
  // Fix: If link is a full URL, extract only the path for expo-router
  let internalLink = extraData.link;
  if (internalLink?.startsWith("http")) {
    try {
      const url = new URL(internalLink);
      internalLink = url.pathname + url.search; // Converts http://192.../myorders to /myorders
    } catch (e) {
      console.error("Invalid URL in notification link", e);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: extraData.senderId ? `From: ${extraData.senderId}\n${body}` : body,
      sound: true,
      data: {
        link: internalLink, // Use the cleaned internal path
        orderId: extraData.orderId,
      },
    },
    trigger: null,
  });
}
