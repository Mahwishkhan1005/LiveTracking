import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const RiderOrders = () => {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Dropdown Modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const API_BASE_URL = "http://192.168.0.201:8081";
  const STATUS_OPTIONS = ["PICKED_UP", "DELIVERED", "CASH_COLLECTED"];

  // --- Helper: Universal Token Retrieval ---
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

  // --- 1. Fetch Orders (GET) ---
  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No token available");

      const response = await axios.get(`${API_BASE_URL}/api/rider/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching rider history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
  }, []);

  // --- 2. Update Status (PATCH) ---
  const updateStatus = async (status: string) => {
    if (!selectedOrder) return;
    setIsUpdating(true);

    try {
      const token = await getAuthToken();

      // Explicit configuration for Web compatibility
      await axios({
        method: "patch",
        url: `${API_BASE_URL}/api/rider/orders/${selectedOrder.orderId}/status`,
        params: { status }, // Sending status as query parameter
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: {}, // Empty body often required by Web browsers for PATCH
      });

      const successMsg = `Order #${selectedOrder.orderId} updated to ${status.replace("_", " ")}`;

      if (Platform.OS === "web") {
        window.alert(successMsg);
      } else {
        Alert.alert("Success", successMsg);
      }

      setModalVisible(false);
      await fetchMyOrders(); // Refresh the list
    } catch (error: any) {
      console.error("Update error:", error.response?.data || error.message);
      const errorMsg = "Update failed. On web, this is usually a CORS issue.";
      Platform.OS === "web"
        ? window.alert(errorMsg)
        : Alert.alert("Error", errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "RIDER_ACCEPTED":
        return "#2E8B57";
      case "PICKED_UP":
        return "#E67E22";
      case "DELIVERED":
        return "#4ADE80";
      case "CASH_COLLECTED":
        return "#8E44AD";
      case "CANCELLED":
        return "#FB7185";
      default:
        return "#666";
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.orderCard}
      onPress={() => {
        // Navigates to the map/navigation page and passes the ID
        router.push({
          pathname: "/navigationPage",
          params: { orderId: item.orderId },
        });
      }}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.orderId}</Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()} |{" "}
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status?.replace("_", " ")}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsContainer}>
        {item.items.map((prod: any, index: number) => (
          <Text key={index} style={styles.productText}>
            • {prod.quantity}x Product ID {prod.productId}
          </Text>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.paymentInfo}>
          <Ionicons name="card-outline" size={16} color="#666" />
          <Text style={styles.paymentText}>{item.paymentMode}</Text>
        </View>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={(e) => {
            // This stops the click from "bubbling up" to the main card
            e.stopPropagation();
            setSelectedOrder(item);
            setModalVisible(true);
          }}
        >
          <Text style={styles.updateButtonText}>Update Status</Text>
          <Ionicons name="chevron-down" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={fetchMyOrders} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2E8B57" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.orderId.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No order history found.</Text>
            </View>
          }
        />
      )}

      {/* --- Selection Modal --- */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback
          onPress={() => !isUpdating && setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownCard}>
              <Text style={styles.modalTitle}>
                Update Order #{selectedOrder?.orderId}
              </Text>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.statusOption}
                  onPress={() => updateStatus(status)}
                  disabled={isUpdating}
                >
                  <Text style={styles.statusOptionText}>
                    {status.replace("_", " ")}
                  </Text>
                  {isUpdating && (
                    <ActivityIndicator size="small" color="#2E8B57" />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={isUpdating}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F6" },
  header: {
    height: 100,
    backgroundColor: "#2E8B57",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  backBtn: { padding: 5 },
  refreshBtn: { padding: 5 },
  listContent: { padding: 15 },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderId: { fontSize: 17, fontWeight: "bold", color: "#333" },
  dateText: { fontSize: 12, color: "#999", marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 12 },
  detailsContainer: { marginBottom: 10 },
  productText: { fontSize: 14, color: "#666", marginBottom: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  paymentInfo: { flexDirection: "row", alignItems: "center" },
  paymentText: { fontSize: 13, color: "#666", marginLeft: 5 },
  updateButton: {
    backgroundColor: "#2E8B57",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  updateButtonText: {
    color: "white",
    fontWeight: "bold",
    marginRight: 5,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownCard: {
    backgroundColor: "white",
    width: "80%",
    borderRadius: 20,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  statusOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  statusOptionText: { fontSize: 16, color: "#2E8B57", fontWeight: "600" },
  cancelBtn: { marginTop: 15, padding: 10, alignItems: "center" },
  cancelBtnText: { color: "#666", fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#999", fontSize: 16 },
});

export default RiderOrders;
