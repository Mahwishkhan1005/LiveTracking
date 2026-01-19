import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [location, setLocation] = useState<any>(null);

  const webViewRef = useRef<WebView>(null);
  const ws = useRef<WebSocket | null>(null);

  // Reusing your token retrieval logic
  const getAuthToken = async () => {
    try {
      return Platform.OS === "web"
        ? await AsyncStorage.getItem("userToken")
        : await SecureStore.getItemAsync("userToken");
    } catch (e) {
      console.error("Token access error", e);
      return null;
    }
  };

  useEffect(() => {
    let locationSubscription: any;

    const startTracking = async () => {
      // 1. Request GPS Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      // 2. Setup WebSocket with your specific URL
      const token = await getAuthToken();
      // Replace localhost with your server IP if testing on a physical device
      const socketUrl = `ws://192.168.0.201:8081/ws/location?token=${token}`;
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () =>
        console.log("WebSocket Connected to Location Service");
      ws.current.onerror = (e) => console.error("WebSocket Error:", e);

      // 3. Watch Live GPS Position
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Update every 5 meters
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation({ latitude, longitude });

          // 4. Send your specific Payload to the server
          if (ws.current?.readyState === WebSocket.OPEN) {
            const payload = {
              lat: latitude,
              lng: longitude,
            };
            ws.current.send(JSON.stringify(payload));
          }

          // 5. Update the Map Marker via the WebView Bridge
          updateWebMap(latitude, longitude);
        }
      );
    };

    startTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (ws.current) ws.current.close();
    };
  }, []);

  const updateWebMap = (lat: number, lng: number) => {
    if (webViewRef.current) {
      const jsCode = `
        if (typeof riderMarker !== 'undefined') {
          riderMarker.setLatLng([${lat}, ${lng}]);
          map.panTo([${lat}, ${lng}]);
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
        #map { height: 100vh; width: 100vw; }
        .rider-icon { background-color: #2E8B57; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${location?.latitude || 17.385}, ${location?.longitude || 78.486}], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var riderIcon = L.divIcon({ className: 'rider-icon' });
        var riderMarker = L.marker([${location?.latitude || 17.385}, ${location?.longitude || 78.486}], { icon: riderIcon }).addTo(map);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      <View style={styles.mapContainer}>
        {location ? (
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: mapHtml }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2E8B57" />
            <Text style={styles.loadingText}>Initializing Live GPS...</Text>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderIdText}>Order #{orderId}</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.navText}>
          Transmitting coordinates to server...
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
  loadingText: { marginTop: 10, color: "#666", fontWeight: "500" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 50,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  liveBadge: {
    backgroundColor: "#FB7185",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  navText: { color: "#2E8B57", marginTop: 5, fontWeight: "600" },
});
