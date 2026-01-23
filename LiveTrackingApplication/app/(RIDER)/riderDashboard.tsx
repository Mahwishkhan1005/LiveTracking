import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location"; // Added for live tracking
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useRef, useState } from "react"; // Added useRef
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { setupSSENotifications } from "../../utils/notificationService";

const RiderDashboard = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const router = useRouter();
  const ws = useRef<WebSocket | null>(null); // WebSocket reference
  const API_BASE_URL = "http://192.168.0.232:8081";

  // --- 1. FETCH ASSIGNED ORDERS (GET) ---
  const fetchAssignedOrders = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoadingOrders(true);
    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      const riderId = await AsyncStorage.getItem("riderId");
      if (!riderId) {
        if (showLoadingIndicator) setLoadingOrders(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/admin/assign/rider/${riderId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setOrders(response.data);
    } catch (error: any) {
      console.error("Fetch orders error:", error.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  // --- 2. LIVE COORDINATES TRACKER (WebSocket) ---
  useEffect(() => {
    let locationSubscription: any;

    const startLiveTracking = async () => {
      // A. Request Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      // B. Get Auth Token for WebSocket
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      // C. Initialize WebSocket
      const socketUrl = `ws://192.168.0.220:8081/ws/location?token=${token}`;
      ws.current = new WebSocket(socketUrl);

      ws.current.onopen = () =>
        console.log("🛰️ Rider Tracker WebSocket Connected");
      ws.current.onerror = (e) => console.error("WebSocket Error:", e);

      // D. Watch Position and Send Updates
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;

          // Send to server via WebSocket
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(
              JSON.stringify({
                lat: latitude,
                lng: longitude,
              }),
            );
            console.log(`📍 [DASHBOARD GPS]: Sent ${latitude}, ${longitude}`);
          }
        },
      );
    };

    // Only track if rider is active
    if (isActive) {
      startLiveTracking();
    }

    // Cleanup: Stop tracking and close socket
    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [isActive]); // Re-run if rider toggles "Online/Offline" status

  // --- 3. NOTIFICATION SETUP ---
  useEffect(() => {
    let stopSSE: (() => void) | undefined;

    const startNotifications = async () => {
      const rId = await AsyncStorage.getItem("riderId");
      if (rId) {
        stopSSE = await setupSSENotifications(rId);
      }
    };

    startNotifications();

    return () => {
      if (stopSSE) stopSSE();
    };
  }, []);

  // --- 4. PULL TO REFRESH LOGIC ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAssignedOrders(false);
    setRefreshing(false);
  }, []);

  // --- 5. HANDLE DECISION (POST) ---
  const handleDecision = async (
    orderId: number,
    decision: "ACCEPTED" | "REJECTED",
  ) => {
    const isExpired =
      orders.find((o) => o.order.id === orderId)?.status === "EXPIRED ";
    if (isExpired) return;

    setProcessingId(orderId);
    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      const riderId = await AsyncStorage.getItem("riderId");

      if (!riderId) {
        Alert.alert("Error", "Rider ID not found. Please login again.");
        return;
      }

      const payload = {
        orderId: orderId,
        riderId: riderId,
        decision: decision,
      };

      await axios.post(`${API_BASE_URL}/api/rider/decision`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      Alert.alert(
        "Success",
        `Order #${orderId} has been ${decision.toLowerCase()}.`,
      );

      fetchAssignedOrders(false);
    } catch (error: any) {
      console.error("Decision Error:", error.response?.data || error.message);
      Alert.alert("Update Failed", "Could not submit your decision.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    setDropdownVisible(false);

    const performLogout = async () => {
      try {
        await AsyncStorage.removeItem("userRole");
        await AsyncStorage.removeItem("userId");
        await AsyncStorage.removeItem("riderId");

        if (Platform.OS === "web") {
          await AsyncStorage.removeItem("userToken");
        } else {
          await SecureStore.deleteItemAsync("userToken");
        }

        router.replace("/");
      } catch (error) {
        console.error("Logout Error:", error);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        performLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout },
      ]);
    }
  };

  const toggleStatus = async (value: boolean) => {
    setStatusLoading(true);
    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      await axios.put(
        `${API_BASE_URL}/api/rider/status`,
        { isActive: value },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setIsActive(value);
    } catch (error) {
      Alert.alert("Error", "Failed to update status.");
    } finally {
      setStatusLoading(false);
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const isProcessing = processingId === item.order.id;
    const isExpired = item.status === "EXPIRED";
    const isAccepted = item.status === "ACCEPTED";
    const isRejected = item.status === "REJECTED";
    const isDisabled = isProcessing || isExpired || isAccepted || isRejected;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderIdText}>Order #{item.order.id}</Text>
            <Text style={styles.amountText}>
              Amount: ₹{item.order.totalAmount}
            </Text>
            <Text style={styles.orderTime}>
              Assigned:{" "}
              {new Date(item.assignedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View
            style={[
              styles.pendingBadge,
              (isExpired || isRejected) && { backgroundColor: "#F3F4F6" },
              isAccepted && { backgroundColor: "#DCFCE7" },
            ]}
          >
            <Text
              style={[
                styles.pendingText,
                (isExpired || isRejected) && { color: "#6B7280" },
                isAccepted && { color: "#166534" },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.btn,
              styles.rejectBtn,
              isDisabled && { opacity: 0.5 },
            ]}
            onPress={() => handleDecision(item.order.id, "REJECTED")}
            disabled={isDisabled}
          >
            <Text style={styles.rejectBtnText}>
              {isRejected ? "Rejected" : "Reject"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btn,
              styles.acceptBtn,
              isDisabled && { opacity: 0.5 },
            ]}
            onPress={() => handleDecision(item.order.id, "ACCEPTED")}
            disabled={isDisabled}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.acceptBtnText}>
                {isExpired ? "Expired" : isAccepted ? "Accepted" : "Accept"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Ionicons name="restaurant-outline" size={22} color="white" />
          <Text style={styles.brandName}>Seafood</Text>
        </View>
        <View style={styles.headerSearchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color="rgba(255,255,255,0.8)"
          />
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search orders..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={() => setDropdownVisible(true)}>
          <Ionicons name="person-circle-outline" size={35} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2E8B57"]}
            tintColor="#2E8B57"
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.thankYouCard}>
              <View style={styles.thankYouContent}>
                <View style={styles.iconCircle}>
                  <Ionicons name="heart" size={24} color="white" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.thankYouTitle}>
                    Thank you for being our
                  </Text>
                  <Text style={styles.thankYouSubtitle}>
                    delivery partners!
                  </Text>
                </View>
              </View>
              <View style={styles.statusSection}>
                <View>
                  <Text style={styles.statusLabel}>Availability Status</Text>
                  <Text
                    style={[
                      styles.statusIndicator,
                      { color: isActive ? "#4ADE80" : "#FB7185" },
                    ]}
                  >
                    {isActive ? "● Online & Active" : "● Offline"}
                  </Text>
                </View>
                {statusLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Switch
                    trackColor={{ false: "#767577", true: "#2E8B57" }}
                    onValueChange={toggleStatus}
                    value={isActive}
                  />
                )}
              </View>
            </View>
            <Text style={styles.pipelineTitle}>Order Pipeline</Text>
          </>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loadingOrders ? (
              <ActivityIndicator size="large" color="#2E8B57" />
            ) : (
              <Text style={styles.emptyText}>No new orders assigned.</Text>
            )}
          </View>
        }
      />

      <Modal transparent visible={dropdownVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setDropdownVisible(false);
                  router.push("/notification");
                }}
              >
                <Ionicons name="notifications-outline" size={20} color="#333" />
                <Text style={styles.dropdownText}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setDropdownVisible(false);
                  router.push("/riderOrder");
                }}
              >
                <Ionicons name="list-outline" size={20} color="#333" />
                <Text style={styles.dropdownText}>My Orders</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="red" />
                <Text style={[styles.dropdownText, { color: "red" }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    height: 110,
    paddingTop: 40,
    backgroundColor: "#2E8B57",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  brandContainer: { flexDirection: "row", alignItems: "center" },
  brandName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginLeft: 6,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginHorizontal: 10,
  },
  headerSearchInput: { flex: 1, color: "white", marginLeft: 8 },
  thankYouCard: {
    backgroundColor: "#36656B",
    margin: 15,
    padding: 20,
    borderRadius: 20,
  },
  thankYouContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  iconCircle: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 10,
    borderRadius: 25,
  },
  textContainer: { marginLeft: 15 },
  thankYouTitle: { color: "rgba(255, 255, 255, 0.8)", fontSize: 14 },
  thankYouSubtitle: { color: "white", fontSize: 20, fontWeight: "800" },
  statusSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 15,
  },
  statusLabel: { color: "white", fontSize: 13, fontWeight: "600" },
  statusIndicator: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  pipelineTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
    marginBottom: 10,
    color: "#333",
  },
  orderCard: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  amountText: {
    fontSize: 14,
    color: "#2E8B57",
    fontWeight: "700",
    marginTop: 2,
  },
  orderTime: { fontSize: 12, color: "#666", marginTop: 4 },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: { color: "#D97706", fontSize: 10, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 12 },
  actionRow: { flexDirection: "row", justifyContent: "space-between" },
  btn: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: { backgroundColor: "#2E8B57" },
  rejectBtn: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  acceptBtnText: { color: "white", fontWeight: "bold" },
  rejectBtnText: { color: "#EF4444", fontWeight: "bold" },
  emptyContainer: { marginTop: 40, alignItems: "center" },
  emptyText: { color: "#999", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  dropdownMenu: {
    position: "absolute",
    top: 100,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    width: 180,
    paddingVertical: 8,
    elevation: 10,
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", padding: 12 },
  dropdownText: {
    fontSize: 14,
    marginLeft: 12,
    color: "#333",
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 4,
    marginHorizontal: 10,
  },
});

export default RiderDashboard;
