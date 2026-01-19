import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ManagementPage = () => {
  const router = useRouter();

  // --- CROSS-PLATFORM ALERT HELPER ---
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // --- VALIDATION HELPERS ---
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^[0-9]{10}$/.test(phone);

  // --- RIDER FORM STATE ---
  const [loadingRider, setLoadingRider] = useState(false);
  const [riderForm, setRiderForm] = useState({
    name: "",
    phone: "",
    gmail: "",
    password: "",
    confirmPassword: "",
    vehicleNumber: "",
    vehicleType: "",
  });

  // --- PRODUCT FORM STATE (Removed pid) ---
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    pname: "",
    description: "",
    price: "",
    stock: "",
  });

  // --- IMAGE PICKER HANDLER ---
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

  // --- HANDLE ADD RIDER (With Validation) ---
  const handleAddRider = async () => {
    const { name, phone, gmail, password, confirmPassword } = riderForm;

    // Validation checks
    if (!name || !phone || !gmail || !password || !confirmPassword) {
      showAlert("Error", "Please fill in all required fields");
      return;
    }
    if (!validateEmail(gmail)) {
      showAlert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (!validatePhone(phone)) {
      showAlert("Invalid Phone", "Phone number must be exactly 10 digits.");
      return;
    }
    if (password.length < 8) {
      showAlert(
        "Weak Password",
        "Password must be at least 8 characters long."
      );
      return;
    }
    if (password !== confirmPassword) {
      showAlert("Error", "Passwords do not match");
      return;
    }

    setLoadingRider(true);
    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      const response = await axios.post(
        "http://192.168.0.201:8081/api/admin/create-rider",
        riderForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        showAlert("Success", "Rider registered successfully!");
        setRiderForm({
          name: "",
          phone: "",
          gmail: "",
          password: "",
          confirmPassword: "",
          vehicleNumber: "",
          vehicleType: "MOTOR BIKE",
        });
      }
    } catch (error: any) {
      showAlert(
        "Registration Failed",
        error.response?.data?.message || "Error creating rider."
      );
    } finally {
      setLoadingRider(false);
    }
  };

  // --- HANDLE ADD PRODUCT ---
  const handleAddProduct = async () => {
    if (!productForm.pname || !productForm.price || !selectedImage) {
      showAlert(
        "Error",
        "Please fill in all fields (Name, Price) and select an image."
      );
      return;
    }

    setLoadingProduct(true);
    try {
      const token =
        Platform.OS === "web"
          ? await AsyncStorage.getItem("userToken")
          : await SecureStore.getItemAsync("userToken");

      const formData = new FormData();

      const productData = {
        pname: productForm.pname,
        description: productForm.description,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
      };

      if (Platform.OS === "web") {
        const jsonBlob = new Blob([JSON.stringify(productData)], {
          type: "application/json",
        });
        formData.append("product", jsonBlob);
      } else {
        formData.append("product", JSON.stringify(productData));
      }

      const uri = selectedImage;
      const name = uri.split("/").pop() || "product.jpg";
      const match = /\.(\w+)$/.exec(name);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      if (Platform.OS === "web") {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("image", blob, name);
      } else {
        formData.append("image", { uri, name, type } as any);
      }

      const response = await axios.post(
        "http://192.168.0.224:8081/api/admin/products/addimage",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        showAlert("Success", "Product added successfully!");
        router.replace("/adminDashboard");
        setProductForm({ pname: "", description: "", price: "", stock: "" });
        setSelectedImage(null);
      }
    } catch (error: any) {
      console.error("Add Product Error:", error.response?.data);
      showAlert("Error", "Failed to add product.");
    } finally {
      setLoadingProduct(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Management Center</Text>
          <Text style={styles.headerSubtitle}>Add Rider or Add Product</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* --- ADD RIDER SECTION --- */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bicycle" size={24} color="#2E8B57" />
              <Text style={styles.sectionTitle}>Add Rider</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rider Name"
                  value={riderForm.name}
                  onChangeText={(val) =>
                    setRiderForm({ ...riderForm, name: val })
                  }
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10 Digits"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={riderForm.phone}
                  onChangeText={(val) =>
                    setRiderForm({
                      ...riderForm,
                      phone: val.replace(/[^0-9]/g, ""),
                    })
                  }
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address (Gmail)</Text>
              <TextInput
                style={styles.input}
                placeholder="rider@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={riderForm.gmail}
                onChangeText={(val) =>
                  setRiderForm({ ...riderForm, gmail: val })
                }
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 chars"
                  secureTextEntry
                  value={riderForm.password}
                  onChangeText={(val) =>
                    setRiderForm({ ...riderForm, password: val })
                  }
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Confirm</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm"
                  secureTextEntry
                  value={riderForm.confirmPassword}
                  onChangeText={(val) =>
                    setRiderForm({ ...riderForm, confirmPassword: val })
                  }
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Vehicle Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AP09AB1234"
                  autoCapitalize="characters"
                  value={riderForm.vehicleNumber}
                  onChangeText={(val) =>
                    setRiderForm({ ...riderForm, vehicleNumber: val })
                  }
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Vehicle Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MOTOR BIKE"
                  value={riderForm.vehicleType}
                  onChangeText={(val) =>
                    setRiderForm({ ...riderForm, vehicleType: val })
                  }
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loadingRider && { opacity: 0.7 }]}
              onPress={handleAddRider}
              disabled={loadingRider}
            >
              {loadingRider ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Register Rider</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerLarge} />

          {/* --- ADD PRODUCT SECTION (UI UNCHANGED) --- */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cart" size={24} color="#2E8B57" />
              <Text style={styles.sectionTitle}>Add Product</Text>
            </View>

            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={30} color="#666" />
                  <Text style={{ color: "#666", marginTop: 5 }}>
                    Select Product Image
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Removed Product ID Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Fresh Salmon"
                value={productForm.pname}
                onChangeText={(val) =>
                  setProductForm({ ...productForm, pname: val })
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Product description..."
                multiline
                value={productForm.description}
                onChangeText={(val) =>
                  setProductForm({ ...productForm, description: val })
                }
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Price ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={productForm.price}
                  onChangeText={(val) =>
                    setProductForm({ ...productForm, price: val })
                  }
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={productForm.stock}
                  onChangeText={(val) =>
                    setProductForm({ ...productForm, stock: val })
                  }
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loadingProduct && { opacity: 0.7 }]}
              onPress={handleAddProduct}
              disabled={loadingProduct}
            >
              {loadingProduct ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Add Product</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7F6" },
  header: {
    height: 140,
    backgroundColor: "#2E8B57",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    ...Platform.select({
      android: { elevation: 4 },
      ios: { shadowOpacity: 0.1 },
    }),
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "white" },
  headerTitleContainer: { flexDirection: "column", justifyContent: "center" },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  backButton: { marginRight: 15 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  inputRow: { flexDirection: "row", justifyContent: "space-between" },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, color: "#666", marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  submitButton: {
    backgroundColor: "#2E8B57",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  dividerLarge: { height: 25 },
  imagePicker: {
    width: "100%",
    height: 150,
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { alignItems: "center" },
});

export default ManagementPage;
