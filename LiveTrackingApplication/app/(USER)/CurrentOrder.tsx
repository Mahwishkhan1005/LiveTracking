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

  const API_BASE_URL = "http://192.168.0.232:8081";

  // --- 1. IMPROVED MAP HTML ---
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
        .rider-icon { background-color: #2E8B57; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
        .user-icon { background-color: #3498db; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3); }
        .marker-label { 
          color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .user-label { background: #3498db; }
        .rider-label { background: #2E8B57; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Start map at a neutral location
        var map = L.map('map', { zoomControl: false }).setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        var userMarker = L.marker([0, 0], { icon: L.divIcon({ className: 'user-icon' }) }).addTo(map);
        userMarker.bindTooltip("You", { permanent: true, direction: 'top', className: 'marker-label user-label', offset: [0, -10] });

        var riderMarker = L.marker([0, 0], { icon: L.divIcon({ className: 'rider-icon' }) }).addTo(map);
        riderMarker.bindTooltip("Rider", { permanent: true, direction: 'top', className: 'marker-label rider-label', offset: [0, -10] });

        var riderPath = L.polyline([], { color: '#2E8B57', weight: 3, opacity: 0.6, dashArray: '5, 10' }).addTo(map);

        window.updateUser = function(lat, lng) {
          userMarker.setLatLng([lat, lng]);
          fitBounds();
        };

        window.updateRider = function(lat, lng) {
          riderMarker.setLatLng([lat, lng]);
          fitBounds();
        };

        function fitBounds() {
          var coords = [];
          var userLatLng = userMarker.getLatLng();
          var riderLatLng = riderMarker.getLatLng();

          if (userLatLng.lat !== 0) coords.push(userLatLng);
          if (riderLatLng.lat !== 0) coords.push(riderLatLng);

          if (coords.length === 1) {
            map.setView(coords[0], 15);
          } else if (coords.length > 1) {
            var bounds = L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            riderPath.setLatLngs([userLatLng, riderLatLng]);
          }
        }
      </script>
    </body>
    </html>
`,
    [],
  );

  // --- 2. INITIAL FETCH & LOCATION ---
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token =
          Platform.OS === "web"
            ? await AsyncStorage.getItem("userToken")
            : await SecureStore.getItemAsync("userToken");

        const response = await axios.get(
          `${API_BASE_URL}/api/user/orders/${orderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setOrderData(response.data);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let loc = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = loc.coords;
          setUserLocation({ latitude, longitude });

          // Inject with a slight delay to ensure WebView is ready
          setTimeout(() => {
            webViewRef.current?.injectJavaScript(
              `window.updateUser(${latitude}, ${longitude});`,
            );
          }, 1000);
        }
      } catch (error: any) {
        console.error("Initialization Error:", error.message);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) initializeData();
  }, [orderId]);

  // --- 3. WEBSOCKET (Rider Updates) ---
  useEffect(() => {
    let socket: WebSocket;
    const connectWS = async () => {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      socket = new WebSocket(
        `ws://192.168.0.232:8081/ws/location?token=${token}`,
      );
      ws.current = socket;

      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.lat && data.lng) {
          setLiveCoords({ lat: data.lat, lng: data.lng });
          webViewRef.current?.injectJavaScript(
            `window.updateRider(${data.lat}, ${data.lng});`,
          );
        }
      };
    };
    connectWS();
    return () => socket?.close();
  }, [orderId]);

  // --- 4. CONTINUOUS USER TRACKING ---
  useEffect(() => {
    let userTrackingSub: any;
    const startTracking = async () => {
      userTrackingSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setUserLocation({ latitude, longitude });
          webViewRef.current?.injectJavaScript(
            `window.updateUser(${latitude}, ${longitude});`,
          );
        },
      );
    };
    startTracking();
    return () => userTrackingSub?.remove();
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E8B57" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
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
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false} // Prevents map from interfering with ScrollView
          />
        </View>

        {/* Info Cards... */}
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

        {/* Status & Item Cards... */}
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
    height: 350,
    margin: 15,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    backgroundColor: "#ddd",
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
});

export default CurrentOrder;
