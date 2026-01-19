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

  const [liveCoords, setLiveCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const webViewRef = useRef<WebView>(null);
  const ws = useRef<WebSocket | null>(null);

  const API_BASE_URL = "http://192.168.0.201:8081";

  const getAuthToken = async () => {
    try {
      return Platform.OS === "web"
        ? await AsyncStorage.getItem("userToken")
        : await SecureStore.getItemAsync("userToken");
    } catch (e) {
      return null;
    }
  };

  // --- 1. INITIAL DATA FETCH ---
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = await getAuthToken();
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let loc = await Location.getCurrentPositionAsync({});
          setUserLocation(loc.coords);
        }

        const response = await axios.get(
          `${API_BASE_URL}/api/user/orders/${orderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOrderData(response.data);
      } catch (error: any) {
        console.error("❌ [Init] Initialization failed:", error.message);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) initializeData();
  }, [orderId]);

  // --- 2. TRANSMIT USER LOCATION (POST) ---
  useEffect(() => {
    let userTrackingSub: any;

    const startUserTracking = async () => {
      const token = await getAuthToken();

      // Watch user's live position
      userTrackingSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters to avoid spamming the server
        },
        async (newLocation) => {
          const { latitude, longitude } = newLocation.coords;

          const payload = {
            lat: latitude,
            lng: longitude,
          };

          console.log("📤 [POST] Transmitting User Location:", payload);

          try {
            await axios.post(`${API_BASE_URL}/api/user/location`, payload, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
            console.log("✅ [POST] User Location synced with server.");
          } catch (err: any) {
            console.error(
              "❌ [POST] Failed to sync user location:",
              err.message
            );
          }
        }
      );
    };

    startUserTracking();

    return () => {
      if (userTrackingSub) userTrackingSub.remove();
    };
  }, []);

  // --- 3. RECEIVE RIDER LOCATION (WEBSOCKET) ---
  useEffect(() => {
    const connectToTracking = async () => {
      const token = await getAuthToken();
      const socketUrl = `ws://192.168.0.201:8081/ws/location?token=${token}`;

      console.log(`🔌 [WS] Attempting to connect: ${socketUrl}`);
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () =>
        console.log("✅ [WS] Connected to Location Service.");

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.lat && data.lng) {
            setLiveCoords({ lat: data.lat, lng: data.lng });
            updateRiderOnMap(data.lat, data.lng);
          }
        } catch (error) {
          console.error("❌ [WS] JSON parsing error:", error);
        }
      };

      ws.current.onerror = (err: any) =>
        console.error("❌ [WS] Error occurred:", err.message);
      ws.current.onclose = (event) => console.log(`🔌 [WS] Connection closed.`);
    };

    if (userLocation) connectToTracking();

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [userLocation]);

  const updateRiderOnMap = (riderLat: number, riderLng: number) => {
    if (webViewRef.current && userLocation) {
      const jsCode = `
        if (typeof riderMarker !== 'undefined' && typeof riderPath !== 'undefined') {
          const riderPos = [${riderLat}, ${riderLng}];
          const userPos = [${userLocation.latitude}, ${userLocation.longitude}];
          riderMarker.setLatLng(riderPos);
          riderPath.setLatLngs([userPos, riderPos]);
          const group = new L.featureGroup([riderMarker, userMarker]);
          map.fitBounds(group.getBounds().pad(0.2));
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
        var userPos = [${userLocation?.latitude || 17.385}, ${userLocation?.longitude || 78.486}];
        var map = L.map('map', { zoomControl: false }).setView(userPos, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var userMarker = L.marker(userPos, { icon: L.divIcon({ className: 'user-icon' }) }).addTo(map);
        var riderMarker = L.marker(userPos, { icon: L.divIcon({ className: 'rider-icon' }) }).addTo(map);
        var riderPath = L.polyline([userPos, userPos], { color: '#2E8B57', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(map);
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

        <View style={styles.coordCard}>
          <View style={styles.coordRow}>
            <Ionicons name="location" size={20} color="#2E8B57" />
            <Text style={styles.coordTitle}>Live Rider Coordinates</Text>
          </View>
          {liveCoords ? (
            <View style={styles.coordValues}>
              <View style={styles.coordBox}>
                <Text style={styles.coordLabel}>LATITUDE</Text>
                <Text style={styles.coordValue}>
                  {liveCoords.lat.toFixed(6)}
                </Text>
              </View>
              <View style={styles.coordBox}>
                <Text style={styles.coordLabel}>LONGITUDE</Text>
                <Text style={styles.coordValue}>
                  {liveCoords.lng.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.waitingText}>Waiting for rider to move...</Text>
          )}
        </View>

        {/* --- INFO CARDS --- */}
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
                ? "Rider is heading to you!"
                : "Waiting for assignment..."}
            </Text>
            <Text style={styles.riderSubText}>
              Rider ID: #{orderData?.riderId || "..."}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ... Styles stay the same ...
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
  coordCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },
  coordRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  coordTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  coordValues: { flexDirection: "row", justifyContent: "space-between" },
  coordBox: {
    flex: 0.48,
    backgroundColor: "#F0F9F4",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  coordLabel: {
    fontSize: 10,
    color: "#2E8B57",
    fontWeight: "bold",
    marginBottom: 2,
  },
  coordValue: { fontSize: 14, fontWeight: "bold", color: "#333" },
  waitingText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
  },
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
});

export default CurrentOrder;
