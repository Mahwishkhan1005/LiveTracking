import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Ensure axios is imported
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import RNEventSource from 'react-native-sse';

// UPDATED IP FOR NOTIFICATIONS
const BASE_URL = "http://192.168.0.224:8081";

/**
 * NEW: Fetch all notifications for the current user
 */
export const getNotifications = async () => {
  const token = Platform.OS === 'web' 
    ? await AsyncStorage.getItem('userToken') 
    : await SecureStore.getItemAsync('userToken');

  const response = await axios.get(`${BASE_URL}/api/notifications`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

/**
 * NEW: Fetch unread notification count
 */
export const getUnreadCount = async () => {
  const token = Platform.OS === 'web' 
    ? await AsyncStorage.getItem('userToken') 
    : await SecureStore.getItemAsync('userToken');

  const response = await axios.get(`${BASE_URL}/api/notifications/unread-count`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data; // Usually returns a number or { count: number }
};

/**
 * NEW: Mark a specific notification as read
 */
export const markNotificationAsRead = async (id: string) => {
  const token = Platform.OS === 'web' 
    ? await AsyncStorage.getItem('userToken') 
    : await SecureStore.getItemAsync('userToken');

  await axios.patch(`${BASE_URL}/api/notifications/${id}/read`, {}, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
};

// --- EXISTING SSE LOGIC ---
export const setupSSENotifications = async (userId: string) => {
  const token = Platform.OS === 'web' 
    ? await AsyncStorage.getItem('userToken') 
    : await SecureStore.getItemAsync('userToken');

  const eventSource = new RNEventSource(`${BASE_URL}/api/notifications/subscribe`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  eventSource.addEventListener('open' as any, () => {
    console.log("SSE: Connected to notification stream for user:", userId);
  });

  eventSource.addEventListener('error' as any, (error: any) => {
    console.error("SSE: Connection error:", error);
  });

  const eventTypes = [
    'PLACED',
    'RIDER_REQUESTED',
    'RIDER_ACCEPTED',
    'PICKED_UP',
    'DELIVERED',
    'CANCELLED',
    'CASH_COLLECTED',
    'PAYMENT_PENDING'
  ];
  eventTypes.forEach(type => {
    eventSource.addEventListener(type as any, (event: any) => {
      try {
        const data = JSON.parse(event.data || "{}");
        const titleMap: any = {
          'PLACED': "📦 Order Placed",
          'RIDER_REQUESTED': "🔍 Finding Rider",
          'RIDER_ACCEPTED': "🚴 Rider Assigned",
          'PICKED_UP': "🥡 Order Picked Up",
          'DELIVERED': "✅ Delivered",
          'CANCELLED': "❌ Order Cancelled",
          'CASH_COLLECTED': "💵 Payment Received",
          'PAYMENT_PENDING': "⏳ Payment Pending"
        };
        showLocalNotification(titleMap[type], data.message || "Status updated!");
      } catch (e) {
        console.error(`${type} Parse Error:`, e);
      }
    });
  });

  return () => {
    console.log("SSE: Closing connection");
    eventSource.close();
  };
};

async function showLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { 
      title, 
      body, 
      sound: true,
      data: { url: '/(USER)/myorders' } 
    },
    trigger: null,
  });
}