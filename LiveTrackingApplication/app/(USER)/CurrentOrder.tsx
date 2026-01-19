import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const CurrentOrder = () => {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<any>(null);

  const webViewRef = useRef<WebView>(null);
  const ws = useRef<WebSocket | null>(null);

  const API_BASE_URL = "http://192.168.0.201:8081";

  // Reusing universal token retrieval logic
  const getAuthToken = async () => {
    console.log("🔑 [Auth] Attempting to retrieve user token...");
    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");
      console.log(
        token
          ? "✅ [Auth] Token retrieved successfully."
          : "⚠️ [Auth] No token found in storage."
      );
      return token;
    } catch (e) {
      console.error("❌ [Auth] Token access error:", e);
      return null;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      console.log(`🚀 [Init] Starting initialization for Order #${orderId}`);
      try {
        const token = await getAuthToken();

        // 1. Get User Device Location
        console.log("🛰️ [GPS] Requesting user location permissions...");
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          console.log(
            "🛰️ [GPS] Permission granted. Fetching current position..."
          );
          let loc = await Location.getCurrentPositionAsync({});
          console.log("🛰️ [GPS] User Location Acquired:", loc.coords);
          setUserLocation(loc.coords);
        } else {
          console.warn("⚠️ [GPS] Location permission denied.");
        }

        // 2. Fetch Order Data via API
        console.log(`📡 [API] Fetching details for Order #${orderId}...`);
        const response = await axios.get(
          `${API_BASE_URL}/api/user/orders/${orderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("📡 [API] Order data received:", response.data);
        setOrderData(response.data);
      } catch (error: any) {
        console.error("❌ [Init] Initialization failed:", error.message);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) initializeData();
  }, [orderId]);

  // WebSocket lifecycle management
  useEffect(() => {
    const connectToTracking = async () => {
      const token = await getAuthToken();
      const socketUrl = `ws://192.168.0.201:8081/ws/location?token=${token}`;

      console.log("🔌 [WS] Attempting to connect to:", socketUrl);
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () => {
        console.log("✅ [WS] Connected to Location Service.");
      };

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          // Log every incoming location update with a timestamp
          console.log(
            `📍 [WS Update] Received Rider Location @ ${new Date().toLocaleTimeString()}:`,
            data
          );

          if (data.lat && data.lng) {
            updateRiderOnMap(data.lat, data.lng);
          } else {
            console.warn(
              "⚠️ [WS] Received data but coordinates are missing:",
              data
            );
          }
        } catch (error) {
          console.error("❌ [WS] Message parsing error:", error);
        }
      };

      ws.current.onerror = (err) => {
        console.error("❌ [WS] Connection Error:", err);
      };

      ws.current.onclose = (e) => {
        console.log(
          `ℹ️ [WS] Connection Closed. Code: ${e.code}, Reason: ${e.reason}`
        );
      };
    };

    if (userLocation) {
      connectToTracking();
    } else {
      console.log(
        "⏳ [WS] Waiting for user location before connecting WebSocket..."
      );
    }

    return () => {
      if (ws.current) {
        console.log("🔌 [Cleanup] Closing WebSocket connection.");
        ws.current.close();
      }
    };
  }, [userLocation]);

  const updateRiderOnMap = (riderLat: number, riderLng: number) => {
    if (webViewRef.current && userLocation) {
      console.log("🎨 [Map] Injecting new coordinates into WebView...");
      const jsCode = `
        if (typeof riderMarker !== 'undefined' && typeof riderPath !== 'undefined') {
          const riderPos = [${riderLat}, ${riderLng}];
          const userPos = [${userLocation.latitude}, ${userLocation.longitude}];
          
          riderMarker.setLatLng(riderPos);
          riderPath.setLatLngs([userPos, riderPos]);
          
          const group = new L.featureGroup([riderMarker, userMarker]);
          map.fitBounds(group.getBounds().pad(0.2));
          console.log("Web: Map elements updated successfully.");
        } else {
          console.error("Web: Leaflet elements not initialized yet.");
        }
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  };

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; background: #eee; }
        .rider-icon { background-color: #2E8B57; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
        .user-icon { background-color: #3498db; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        console.log("Web: Initializing Leaflet map...");
        var userPos = [${userLocation?.latitude || 17.385}, ${userLocation?.longitude || 78.486}];
        var map = L.map('map', { zoomControl: false }).setView(userPos, 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        var userMarker = L.marker(userPos, { 
          icon: L.divIcon({ className: 'user-icon' }) 
        }).addTo(map);

        var riderMarker = L.marker(userPos, { 
          icon: L.divIcon({ className: 'rider-icon' }) 
        }).addTo(map);
        
        var riderPath = L.polyline([userPos, userPos], {
          color: '#2E8B57',
          weight: 4,
          opacity: 0.6,
          dashArray: '10, 10'
        }).addTo(map);
        console.log("Web: Leaflet ready.");
      </script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#2E8B57" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled={true}
          />
          <View style={styles.liveBadgeOverlay}>
            <Text style={styles.liveBadgeText}>● LIVE TRACKING</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Order Details</Text>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={24} color="#2E8B57" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {orderData?.status?.replace("_", " ")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Items Ordered</Text>
          {orderData?.items.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>Product ID: {item.productId}</Text>
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{orderData?.totalAmount}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.riderRow}>
          <View style={styles.riderIcon}>
            <Ionicons name="bicycle" size={24} color="white" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.riderName}>
              {orderData?.riderId
                ? "Your delivery partner is moving!"
                : "Waiting for assignment..."}
            </Text>
            <Text style={styles.riderSubText}>
              Rider ID: #{orderData?.riderId || "..."}
            </Text>
          </View>
          {orderData?.riderId && (
            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="call" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    height: 100,
    paddingTop: 40,
    backgroundColor: "#2E8B57",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  mapContainer: {
    height: 250,
    margin: 15,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    backgroundColor: "#eee",
  },
  map: { flex: 1 },
  liveBadgeOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  liveBadgeText: { color: "#4ADE80", fontSize: 10, fontWeight: "bold" },
  infoCard: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoTextContainer: { marginLeft: 15 },
  infoTitle: { fontSize: 14, fontWeight: "bold", color: "#333" },
  statusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  statusText: { color: "#2E8B57", fontWeight: "bold", fontSize: 11 },
  sectionHeading: { fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  itemText: { fontSize: 13, color: "#555" },
  itemQuantity: { fontSize: 13, color: "#888" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontWeight: "bold" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#2E8B57" },
  footer: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 20,
  },
  riderRow: { flexDirection: "row", alignItems: "center" },
  riderIcon: { backgroundColor: "#2E8B57", padding: 10, borderRadius: 50 },
  riderName: { fontSize: 15, fontWeight: "bold" },
  riderSubText: { fontSize: 12, color: "#777" },
  callButton: { backgroundColor: "#2E8B57", padding: 12, borderRadius: 12 },
});

export default CurrentOrder;
