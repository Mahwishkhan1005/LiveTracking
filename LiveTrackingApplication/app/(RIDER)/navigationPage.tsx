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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

export default function NavigationPage() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();

  // --- STATES ---
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const webViewRef = useRef<WebView>(null);
  const ws = useRef<WebSocket | null>(null);

  const API_BASE_URL = "http://192.168.0.213:8081";

  const getAuthToken = async () => {
    try {
      return Platform.OS === "web"
        ? await AsyncStorage.getItem("userToken")
        : await SecureStore.getItemAsync("userToken");
    } catch (e) {
      return null;
    }
  };

  // --- 1. FETCH CUSTOMER LOCATION FROM BACKEND ---
  useEffect(() => {
    const fetchCustomerLocation = async () => {
      try {
        const token = await getAuthToken();
        console.log("-----------------------------------------");
        console.log(
          `📡 [API CALL] Fetching User Location for Order: #${orderId}`,
        );

        const response = await axios.get(
          `${API_BASE_URL}/api/rider/orders/${orderId}/user-location`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        // LOGGING BACKEND DATA
        console.log(
          "📥 [BACKEND RESPONSE]:",
          JSON.stringify(response.data, null, 2),
        );

        const data = response.data;
        if (data) {
          const newCoords = {
            lat: parseFloat(data.lat || data.latitude),
            lng: parseFloat(data.lng || data.longitude),
          };

          console.log("📍 [MAPPED COORDS]:", newCoords);
          setCustomerLocation(newCoords);

          // Inject to map immediately if map is ready
          updateCustomerMarker(newCoords.lat, newCoords.lng);
        }
      } catch (error: any) {
        console.error(
          "❌ [FETCH ERROR]:",
          error.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchCustomerLocation();
  }, [orderId]);

  // --- 2. RIDER GPS TRACKING ---
  useEffect(() => {
    let locationSubscription: any;

    const startTracking = async () => {
      // Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("❌ Permission to access location was denied");
        return;
      }

      // Initial Position
      let initialLocation = await Location.getCurrentPositionAsync({});
      setRiderLocation({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      });

      // Start WebSocket for real-time updates to backend
      const token = await getAuthToken();
      const socketUrl = `ws://192.168.0.201:8081/ws/location?token=${token}`;
      ws.current = new WebSocket(socketUrl);

      // Start Watching Position
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Update every 5 meters
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          console.log(`📱 [GPS SIGNAL]: Rider is at ${latitude}, ${longitude}`);

          setRiderLocation({ latitude, longitude });

          // Send to server via WebSocket
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ lat: latitude, lng: longitude }));
          }

          // Update Map via JS Injection
          updateRiderMarker(latitude, longitude);
        },
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (ws.current) ws.current.close();
    };
  }, []);

  // --- 3. DYNAMIC MAP UPDATES (NO RELOAD) ---
  const updateRiderMarker = (lat: number, lng: number) => {
    const jsCode = `
      if (window.riderMarker) {
        window.riderMarker.setLatLng([${lat}, ${lng}]);
        window.updateMapBounds();
      }
    `;
    webViewRef.current?.injectJavaScript(jsCode);
  };

  const updateCustomerMarker = (lat: number, lng: number) => {
    const jsCode = `
      if (window.customerMarker) {
        window.customerMarker.setLatLng([${lat}, ${lng}]);
        window.updateMapBounds();
      }
    `;
    webViewRef.current?.injectJavaScript(jsCode);
  };

  // --- 4. MAP HTML ---
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .rider-icon { background-color: #2E8B57; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3); }
        .customer-icon { background-color: #EF4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3); }
        .label { background: #EF4444; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${riderLocation?.latitude || 17.385}, ${riderLocation?.longitude || 78.486}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        window.riderMarker = L.marker([${riderLocation?.latitude || 17.385}, ${riderLocation?.longitude || 78.486}], { 
          icon: L.divIcon({ className: 'rider-icon' }) 
        }).addTo(map);

        window.customerMarker = L.marker([${customerLocation?.lat || 17.385}, ${customerLocation?.lng || 78.486}], { 
          icon: L.divIcon({ className: 'customer-icon' }) 
        }).addTo(map);

        window.customerMarker.bindTooltip("User", { permanent: true, direction: 'top', className: 'label', offset: [0, -10] }).openTooltip();

        window.updateMapBounds = function() {
          if (window.riderMarker && window.customerMarker) {
             var group = new L.featureGroup([window.riderMarker, window.customerMarker]);
             map.fitBounds(group.getBounds().pad(0.3));
          }
        };
        window.updateMapBounds();
      </script>
    </body>
    </html>
  `;

  if (loading && !riderLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={{ marginTop: 10 }}>Initializing Navigation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          key={orderId}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderIdText}>Order #{orderId}</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.navText}>
          {customerLocation ? "Heading to Customer" : "Fetching destination..."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 50,
    elevation: 5,
  },
  infoCard: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "white",
    padding: 25,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  liveBadge: {
    backgroundColor: "#FB7185",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  navText: { color: "#2E8B57", marginTop: 5, fontWeight: "600", fontSize: 13 },
});
