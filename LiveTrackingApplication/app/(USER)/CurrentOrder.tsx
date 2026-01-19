import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

  // --- 1. STATIC MAP HTML (Prevents Reloading) ---
  const mapHtml = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; background: #eee; }
        .leaflet-marker-icon { transition: all 0.5s linear; }
        .rider-icon { background-color: #2E8B57; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
        .user-icon { background-color: #3498db; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([17.385, 78.486], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var userMarker = L.marker([17.385, 78.486], { icon: L.divIcon({ className: 'user-icon' }) }).addTo(map);
        var riderMarker = L.marker([17.385, 78.486], { icon: L.divIcon({ className: 'rider-icon' }) }).addTo(map);
        var riderPath = L.polyline([], { color: '#2E8B57', weight: 4, opacity: 0.6, dashArray: '10, 10' }).addTo(map);

        window.updatePositions = function(rLat, rLng, uLat, uLng) {
          const rPos = [rLat, rLng];
          const uPos = [uLat, uLng];
          riderMarker.setLatLng(rPos);
          userMarker.setLatLng(uPos);
          riderPath.setLatLngs([uPos, rPos]);
          const group = new L.featureGroup([riderMarker, userMarker]);
          map.fitBounds(group.getBounds().pad(0.3));
        };
      </script>
    </body>
    </html>
  `,
    [],
  );

  // --- 2. INITIAL FETCH ---
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token =
          Platform.OS === "web"
            ? await AsyncStorage.getItem("userToken")
            : await SecureStore.getItemAsync("userToken");
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let loc = await Location.getCurrentPositionAsync({});
          setUserLocation(loc.coords);
        }
        const response = await axios.get(
          `${API_BASE_URL}/api/user/orders/${orderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setOrderData(response.data);
      } catch (error: any) {
        console.error("Init failed:", error.message);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) initializeData();
  }, [orderId]);

  const animateMap = (
    rLat: number,
    rLng: number,
    uLat: number,
    uLng: number,
  ) => {
    if (webViewRef.current) {
      const jsCode = `window.updatePositions(${rLat}, ${rLng}, ${uLat}, ${uLng});`;
      webViewRef.current.injectJavaScript(jsCode);
    }
  };

  // --- 3. GPS & WS WATCHERS ---
  useEffect(() => {
    let userTrackingSub: any;
    const startTracking = async () => {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      userTrackingSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setUserLocation({ latitude, longitude });
          if (liveCoords)
            animateMap(liveCoords.lat, liveCoords.lng, latitude, longitude);
        },
      );

      const socketUrl = `ws://192.168.0.201:8081/ws/location?token=${token}`;
      ws.current = new WebSocket(socketUrl);
      ws.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.lat && data.lng) {
          setLiveCoords({ lat: data.lat, lng: data.lng });
          if (userLocation)
            animateMap(
              data.lat,
              data.lng,
              userLocation.latitude,
              userLocation.longitude,
            );
        }
      };
    };

    startTracking();
    return () => {
      if (userTrackingSub) userTrackingSub.remove();
      if (ws.current) ws.current.close();
    };
  }, [userLocation, liveCoords]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E8B57" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled={true}
          />
        </View>

        {/* Live Coordinates Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Live Tracking Info</Text>
          <View style={styles.coordValues}>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>RIDER LAT</Text>
              <Text style={styles.coordValue}>
                {liveCoords?.lat.toFixed(4) || "..."}
              </Text>
            </View>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>YOUR LAT</Text>
              <Text style={styles.coordValue}>
                {userLocation?.latitude.toFixed(4) || "..."}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Status Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Order Status</Text>
          <View style={styles.statusRow}>
            <Ionicons name="time-outline" size={22} color="#2E8B57" />
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {orderData?.status?.replace("_", " ") || "Processing"}
              </Text>
            </View>
          </View>
          <Text style={styles.orderIdSub}>Order ID: #{orderId}</Text>
        </View>

        {/* Items Ordered Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Items Ordered</Text>
          {orderData?.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <View>
                <Text style={styles.itemName}>Product #{item.productId}</Text>
                <Text style={styles.itemQty}>Quantity: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price || "N/A"}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{orderData?.totalAmount}</Text>
          </View>
        </View>

        {/* Rider Info Card */}
        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Ionicons name="bicycle" size={24} color="white" />
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>
              {orderData?.riderId ? "Rider Assigned" : "Finding Rider..."}
            </Text>
            <Text style={styles.riderStatus}>
              {orderData?.riderId
                ? `ID: #${orderData.riderId}`
                : "Wait while we assign a delivery partner"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    height: 280,
    margin: 15,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
  },
  map: { flex: 1 },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  coordValues: { flexDirection: "row", justifyContent: "space-between" },
  coordBox: {
    flex: 0.48,
    backgroundColor: "#F0F9F4",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  coordLabel: { fontSize: 9, color: "#2E8B57", fontWeight: "bold" },
  coordValue: { fontSize: 13, fontWeight: "bold" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  statusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  statusText: {
    color: "#2E8B57",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  orderIdSub: { fontSize: 11, color: "#999", marginTop: 8 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemName: { fontSize: 13, color: "#444", fontWeight: "600" },
  itemQty: { fontSize: 11, color: "#777" },
  itemPrice: { fontSize: 13, fontWeight: "bold", color: "#333" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 14, fontWeight: "bold", color: "#666" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#2E8B57" },
  riderCard: {
    flexDirection: "row",
    backgroundColor: "#36656B",
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  riderAvatar: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 50,
  },
  riderInfo: { marginLeft: 15 },
  riderName: { color: "white", fontWeight: "bold", fontSize: 14 },
  riderStatus: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
});

export default CurrentOrder;
