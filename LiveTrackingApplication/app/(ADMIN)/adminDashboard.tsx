import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl, // Required for pull-to-refresh
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { setupSSENotifications } from "../../utils/notificationService";

const { width } = Dimensions.get("window");

const AdminDashboard = () => {
  // --- STATE MANAGEMENT ---
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // New state for pull-to-refresh
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    pid: 0,
    pname: "",
    description: "",
    price: 0,
    stock: 0,
    photo: "",
  });

  const router = useRouter();
  const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

  // --- CROSS-PLATFORM ALERT HELPER ---
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // --- FETCH PRODUCTS LOGIC ---
  const fetchProducts = async (isRefreshing = false) => {
    // Only show center spinner if not pull-refreshing
    if (!isRefreshing) setLoading(true);

    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      const response = await axios.get(
        "http://192.168.0.219:8081/api/admin/products/all",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setProducts(response.data);
      setRefreshKey(Date.now());
    } catch (error) {
      console.error("Fetch Products Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // Stop pull-refresh spinner
    }
  };

  // --- PULL-TO-REFRESH HANDLER ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(true);
  }, []);

  useEffect(() => {
    let stopSSE: (() => void) | undefined;

    const startNotifications = async () => {
      const adminId = await AsyncStorage.getItem("userId");
      if (adminId) {
        // setupSSENotifications returns a cleanup function
        stopSSE = await setupSSENotifications(adminId);
      }
    };

    startNotifications();

    // Clean up the connection when the component unmounts
    return () => {
      if (stopSSE) stopSSE();
    };
  }, []);
  useEffect(() => {
    fetchProducts();
  }, []);

  // --- IMAGE PICKER ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // --- UPDATE LOGIC (Fixed for Android/Web) ---
  const handleUpdate = async () => {
    if (!editForm.pid) {
      showAlert("Error", "Product ID is missing.");
      return;
    }

    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      const formData = new FormData();
      const productData = {
        pid: editForm.pid,
        pname: editForm.pname,
        description: editForm.description,
        price: editForm.price,
        stock: editForm.stock,
      };

      if (Platform.OS === "web") {
        const jsonBlob = new Blob([JSON.stringify(productData)], {
          type: "application/json",
        });
        formData.append("product", jsonBlob);
      } else {
        formData.append("product", JSON.stringify(productData));
      }

      if (selectedImage) {
        const uri = selectedImage;
        const name = uri.split("/").pop() || "upload.jpg";
        const match = /\.(\w+)$/.exec(name);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        if (Platform.OS === "web") {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append("image", blob, name);
        } else {
          formData.append("image", { uri, name, type } as any);
        }
      } else {
        formData.append("image", editForm.photo);
      }

      const response = await axios.put(
        `http://192.168.0.219:8081/api/admin/products/update/${editForm.pid}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          transformRequest: (data) => data, // Ensures FormData isn't stringified on Android
        },
      );

      if (response.status === 200 || response.status === 201) {
        showAlert("Success", "Product updated successfully!");
        setUpdateModalVisible(false);
        fetchProducts();
      }
    } catch (error: any) {
      console.error("Update Error:", error.response?.data);
      showAlert("Error", "Update failed. Check backend logs.");
    }
  };

  // --- DELETE LOGIC ---
  const handleDelete = async () => {
    const performDelete = async () => {
      try {
        const token =
          Platform.OS === "web"
            ? await AsyncStorage.getItem("userToken")
            : await SecureStore.getItemAsync("userToken");

        await axios.delete(
          `http://192.168.0.219:8081/api/admin/products/delete/${editForm.pid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        showAlert("Success", "Product deleted successfully");
        setUpdateModalVisible(false);
        fetchProducts();
      } catch (error) {
        showAlert("Error", "Failed to delete product.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete ${editForm.pname}?`)) performDelete();
    } else {
      Alert.alert(
        "Confirm Delete",
        `Are you sure you want to delete ${editForm.pname}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ],
      );
    }
  };

  // --- LOGOUT LOGIC ---
  const handleLogout = async () => {
    const performLogout = async () => {
      setDropdownVisible(false);
      try {
        await AsyncStorage.removeItem("userRole");
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
      if (window.confirm("Are you sure you want to logout?")) performLogout();
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout },
      ]);
    }
  };

  const openModal = (item: any) => {
    const productId = item.pid || item.id;
    setSelectedImage(null);
    setEditForm({
      pid: productId,
      pname: item.pname,
      description: item.description || "",
      price: item.price,
      stock: item.stock,
      photo: item.photo || "",
    });
    setUpdateModalVisible(true);
  };

  const filteredProducts = products.filter((item) =>
    item.pname?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
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
            placeholder="Search inventory..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={toggleDropdown} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={35} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2E8B57"]} // Android spinner color
            tintColor={"#2E8B57"} // iOS spinner color
          />
        }
      >
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIconContainer}>
            <Ionicons name="hand-left-outline" size={30} color="#2E8B57" />
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.adminName}>Administrator</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inventory</Text>
          <Text style={styles.itemCount}>{filteredProducts.length} Items</Text>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator
            size="large"
            color="#2E8B57"
            style={{ marginTop: 20 }}
          />
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((item, index) => (
              <View
                key={item.pid || item.id || index}
                style={styles.productCard}
              >
                <Image
                  key={`${item.pid || item.id}-${refreshKey}`}
                  source={{
                    uri: `${item.photo}${item.photo?.includes("?") ? "&" : "?"}t=${refreshKey}`,
                  }}
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.pname}
                  </Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {item.description || "No description available."}
                  </Text>
                  <View style={styles.stockRow}>
                    <Text style={styles.productPrice}>${item.price}</Text>
                    <Text
                      style={[
                        styles.productStock,
                        { color: item.stock > 10 ? "#2E8B57" : "#D32F2F" },
                      ]}
                    >
                      Stock: {item.stock}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openModal(item)}
                  >
                    <Text style={styles.editButtonText}>Update Item</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* DROPDOWN MENU */}
      <Modal transparent visible={dropdownVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                onPress={() => {
                  setDropdownVisible(false);
                  router.push("/manage");
                }}
                style={styles.dropdownItem}
              >
                <Ionicons name="person-add-outline" size={20} color="#333" />
                <Text style={styles.dropdownText}>Manage here</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDropdownVisible(false);
                  router.push("/notification");
                }}
                style={styles.dropdownItem}
              >
                <Ionicons name="person-add-outline" size={20} color="#333" />
                <Text style={styles.dropdownText}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDropdownVisible(false);
                  router.push("/(ADMIN)/orderDetail");
                }}
                style={styles.dropdownItem}
              >
                <Ionicons name="book-outline" size={20} color="#333" />
                <Text style={styles.dropdownText}>Order Details</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.dropdownItem}
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

      {/* UPDATE MODAL */}
      <Modal
        transparent
        visible={updateModalVisible}
        animationType="fade"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.centeredModalContainer}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Product</Text>
              <TouchableOpacity onPress={() => setUpdateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{
                      uri:
                        selectedImage ||
                        editForm.photo ||
                        "https://via.placeholder.com/150",
                    }}
                    style={styles.modalImageLarge}
                  />
                  <View style={styles.cameraIconOverlay}>
                    <Ionicons name="camera" size={20} color="white" />
                  </View>
                </View>
              </TouchableOpacity>

              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.pname}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, pname: text })
                }
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                value={editForm.description}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, description: text })
                }
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(editForm.price)}
                    onChangeText={(text) =>
                      setEditForm({ ...editForm, price: parseFloat(text) || 0 })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(editForm.stock)}
                    onChangeText={(text) =>
                      setEditForm({ ...editForm, stock: parseInt(text) || 0 })
                    }
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.updateSubmitButton}
                onPress={handleUpdate}
              >
                <Text style={styles.updateSubmitButtonText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="red" />
                <Text style={styles.deleteButtonText}>Delete Product</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    height: 140,
    paddingTop: 25,
    backgroundColor: "#2E8B57",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 6 },
      ios: { shadowOpacity: 0.2 },
      web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" },
    }),
  },
  brandContainer: { flexDirection: "row", alignItems: "center" },
  brandName: {
    fontSize: 20,
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
    height: 50,
    marginHorizontal: 10,
  },
  headerSearchInput: { flex: 1, color: "white", marginLeft: 8 },
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginVertical: 15,
    marginHorizontal: Platform.OS === "web" ? "2%" : 15,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
  },
  welcomeTextContainer: { marginLeft: 15, flex: 1 },
  welcomeLabel: { fontSize: 14, color: "#666" },
  adminName: { fontSize: 18, fontWeight: "bold", color: "#333" },
  welcomeIconContainer: {
    backgroundColor: "rgba(46, 139, 87, 0.1)",
    padding: 10,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  itemCount: { color: "#2E8B57", fontWeight: "600" },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
  },
  productCard: {
    backgroundColor: "white",
    width: Platform.OS === "web" ? "23%" : "46%",
    marginHorizontal: "1%",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 3,
    shadowOpacity: 0.1,
  },
  productImage: { width: "100%", height: 120, resizeMode: "cover" },
  productInfo: { padding: 10 },
  productName: { fontSize: 15, fontWeight: "bold", color: "#333" },
  productDescription: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
    height: 35,
    lineHeight: 16,
  },
  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  productPrice: { fontSize: 16, color: "#2E8B57", fontWeight: "bold" },
  productStock: { fontSize: 12, fontWeight: "600" },
  editButton: {
    backgroundColor: "#F0F2F5",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  editButtonText: { color: "#333", fontSize: 12, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.2)" },
  dropdownMenu: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    width: 180,
    paddingVertical: 8,
    elevation: 10,
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", padding: 12 },
  dropdownText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 12,
    color: "#333",
  },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 4 },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  centeredModalContainer: {
    backgroundColor: "white",
    width: "90%",
    maxWidth: 450,
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    marginTop: 10,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  inputRow: { flexDirection: "row", justifyContent: "space-between" },
  imageContainer: {
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#F9F9F9",
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEE",
    position: "relative",
  },
  modalImageLarge: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    resizeMode: "contain",
  },
  cameraIconOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 5,
  },
  updateSubmitButton: {
    backgroundColor: "#2E8B57",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  updateSubmitButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    paddingVertical: 10,
  },
  deleteButtonText: {
    color: "red",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 14,
  },
});

export default AdminDashboard;
