import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const OrderDetails = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      // --- FETCH USER ID HERE ---
      const savedUserId = await AsyncStorage.getItem("userId");
      setUserId(savedUserId);

      const response = await axios.get(
        "http://192.168.0.219:8081/api/user/orders",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = Array.isArray(response.data)
        ? response.data
        : [response.data];
      setOrders(data);
    } catch (error) {
      console.error("Fetch Orders Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // UPDATED STATUS COLORS FOR THE FULL LIFECYCLE
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLACED":
        return "#F39C12"; // Orange
      case "RIDER_REQUESTED":
        return "#9B59B6"; // Purple
      case "RIDER_ACCEPTED":
        return "#3498DB"; // Blue
      case "PICKED_UP":
        return "#1ABC9C"; // Turquoise
      case "DELIVERED":
        return "#2E8B57"; // Sea Green
      case "CANCELLED":
        return "#E74C3C"; // Red
      case "CASH_COLLECTED":
        return "#27AE60"; // Success Green
      case "PAYMENT_PENDING":
        return "#E67E22"; // Dark Orange
      default:
        return "#7F8C8D"; // Grey
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        router.push({
          pathname: "/(USER)/CurrentOrder",
          params: {
            orderId: item.orderId,
            // Assuming you have access to userId or can get it from storage
            userId: userId,
          },
        });
      }}
    >
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderIdText}>Order #{item.orderId}</Text>
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
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status.replace("_", " ")}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Payment:</Text>
        <Text style={styles.infoValue}>{item.paymentMode}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Items</Text>
      {item.items.map((subItem: any, index: number) => (
        <View key={index} style={styles.itemRow}>
          <Text style={styles.itemText}>
            Product ID: {subItem.productId} x {subItem.quantity}
          </Text>
          <Text style={styles.itemPriceText}>
            ${subItem.price * subItem.quantity}
          </Text>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalAmountText}>${item.totalAmount}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subtitleCard}>
        <Ionicons name="information-circle-outline" size={20} color="#2E8B57" />
        <Text style={styles.subtitleText}>View all your orders here</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2E8B57"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.orderId.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2E8B57"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#BDC3C7" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    height: Platform.OS === "android" ? 100 : 80,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    backgroundColor: "#2E8B57",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
  subtitleCard: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#2E8B57",
  },
  subtitleText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
    marginLeft: 10,
  },
  listContainer: { padding: 15, paddingTop: 10 },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdText: { fontSize: 18, fontWeight: "bold", color: "#2C3E50" },
  dateText: { fontSize: 13, color: "#7F8C8D", marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 90,
    alignItems: "center",
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  divider: { height: 1, backgroundColor: "#ECF0F1", marginVertical: 12 },
  infoRow: { flexDirection: "row", marginBottom: 4 },
  infoLabel: { fontSize: 14, color: "#7F8C8D", width: 80 },
  infoValue: { fontSize: 14, color: "#2C3E50", fontWeight: "500" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#95A5A6",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  itemText: { fontSize: 14, color: "#34495E" },
  itemPriceText: { fontSize: 14, fontWeight: "600", color: "#2C3E50" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#2C3E50" },
  totalAmountText: { fontSize: 20, fontWeight: "bold", color: "#2E8B57" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 16, color: "#BDC3C7" },
});

export default OrderDetails;
