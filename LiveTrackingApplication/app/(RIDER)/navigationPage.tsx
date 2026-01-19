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

  // States
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // --- 1. FETCH CUSTOMER LOCATION ---
  useEffect(() => {
    const fetchCustomerLocation = async () => {
      try {
        const token = await getAuthToken();
        console.log(`📡 Fetching customer location for Order #${orderId}`);
        const response = await axios.get(
          `${API_BASE_URL}/api/rider/orders/${orderId}/user-location`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Expecting response: { lat: number, lng: number }
        console.log("📍 Customer Location Received:", response.data);
        setCustomerLocation(response.data);
      } catch (error) {
        console.error("❌ Error fetching customer location:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchCustomerLocation();
  }, [orderId]);

  // --- 2. RIDER GPS TRACKING & WEBSOCKET ---
  useEffect(() => {
    let locationSubscription: any;

    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const token = await getAuthToken();
      const socketUrl = `ws://192.168.0.201:8081/ws/location?token=${token}`;
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () => console.log("✅ WebSocket Connected");

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setRiderLocation({ latitude, longitude });

          // Send to server
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ lat: latitude, lng: longitude }));
          }

          // Update Map
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
          // Center map to show both if customer is known
          if (typeof customerMarker !== 'undefined') {
             var group = new L.featureGroup([riderMarker, customerMarker]);
             map.fitBounds(group.getBounds().pad(0.2));
          } else {
             map.panTo([${lat}, ${lng}]);
          }
        }
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  };

  // --- 3. MAP HTML (Two Markers) ---
  // ... (imports and state remain the same)

  // --- 3. MAP HTML (Updated with Tooltip/Label) ---
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
        .customer-icon { background-color: #EF4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); }
        
        /* Tooltip Styling */
        .leaflet-tooltip-own {
          background-color: #EF4444;
          border: none;
          color: white;
          font-weight: bold;
          font-family: Arial;
          padding: 2px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .leaflet-tooltip-left:before, .leaflet-tooltip-right:before {
          display: none;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${riderLocation?.latitude || 17.385}, ${riderLocation?.longitude || 78.486}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // Rider Marker
        var riderMarker = L.marker([${riderLocation?.latitude || 17.385}, ${riderLocation?.longitude || 78.486}], { 
          icon: L.divIcon({ className: 'rider-icon' }) 
        }).addTo(map);

        // Customer Marker with "User" Label
        ${
          customerLocation
            ? `
          var customerMarker = L.marker([${customerLocation.lat}, ${customerLocation.lng}], { 
            icon: L.divIcon({ className: 'customer-icon' }) 
          }).addTo(map);
          
          // ADDING THE PERMANENT LABEL HERE
          customerMarker.bindTooltip("User", { 
            permanent: true, 
            direction: 'top', 
            className: 'leaflet-tooltip-own',
            offset: [0, -10] 
          }).openTooltip();
          
          var group = new L.featureGroup([riderMarker, customerMarker]);
          map.fitBounds(group.getBounds().pad(0.3));
        `
            : ""
        }
      </script>
    </body>
    </html>
  `;

  // ... (the rest of the component remains the same)
  if (loading && !riderLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text>Loading Navigation...</Text>
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
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled={true}
        />
      </View>

      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderIdText}>Delivery for Order #{orderId}</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.navText}>
          {customerLocation
            ? "Customer location found. Navigate to target."
            : "Fetching delivery point..."}
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
