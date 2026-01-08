import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Import Axios
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store'; // Ensure this is imported
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const ManagementPage = () => {
  const router = useRouter();
  const [loadingRider, setLoadingRider] = useState(false);

  // --- RIDER FORM STATE (Matching API Payload) ---
  const [riderForm, setRiderForm] = useState({
    name: '',
    phone: '',
    gmail: '',
    password: '',
    confirmPassword: '',
    vehicleNumber: '',
    vehicleType: '', // Default value
  });

  // --- PRODUCT FORM STATE ---
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');

  // --- HANDLE ADD RIDER API ---
const handleAddRider = async () => {
  // 1. Frontend Validation
  if (!riderForm.name || !riderForm.phone || !riderForm.gmail || !riderForm.password || !riderForm.confirmPassword) {
    Alert.alert("Error", "Please fill in all required fields");
    return;
  }

  if (riderForm.password !== riderForm.confirmPassword) {
    Alert.alert("Error", "Passwords do not match");
    return;
  }

  setLoadingRider(true);

  try {
    // 2. Retrieve the Token from storage
    // Matches the keys used during your login process
    const token = Platform.OS === 'web' 
      ? await AsyncStorage.getItem('userToken') 
      : await SecureStore.getItemAsync('userToken');

    // --- NEW: Token Check ---
    if (!token) {
      Alert.alert("Session Expired", "Please log in again to continue.");
      router.replace('/'); // Redirect to login
      return;
    }

    // 3. API Call with full payload and Authorization Header
    const response = await axios.post(
      'http://192.168.0.201:8082/api/admin/create-rider', // Ensure port 8081 is correct for this service
      riderForm, 
      {
        headers: {
          'Authorization': `Bearer ${token}`, // Adding the JWT token
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      Alert.alert("Success", "Rider registered successfully!");
      // Reset form on success
      setRiderForm({
        name: '', phone: '', gmail: '', password: '', 
        confirmPassword: '', vehicleNumber: '', vehicleType: 'MOTOR BIKE',
      });
    }
  } catch (error: any) {
    console.log("Backend Error Details:", error.response?.data);
    
    // Improved error messaging
    const errorDetail = error.response?.data?.message || 
                        (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                        "Validation Error (400). Please check if the email/phone is already in use.";

    Alert.alert("Registration Failed", errorDetail);
  } finally {
    setLoadingRider(false);
  }
};

  const handleAddProduct = () => {
    if (!productName || !productPrice) {
      Alert.alert("Error", "Please fill in all product details");
      return;
    }
    Alert.alert("Success", "Product added successfully!");
    setProductName('');
    setProductPrice('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Management Center</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                  onChangeText={(val) => setRiderForm({...riderForm, name: val})}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Phone</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Phone Number" 
                  keyboardType="phone-pad"
                  value={riderForm.phone}
                  onChangeText={(val) => setRiderForm({...riderForm, phone: val})}
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
                onChangeText={(val) => setRiderForm({...riderForm, gmail: val})}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Password</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="********" 
                  secureTextEntry
                  value={riderForm.password}
                  onChangeText={(val) => setRiderForm({...riderForm, password: val})}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Confirm</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="********" 
                  secureTextEntry
                  value={riderForm.confirmPassword}
                  onChangeText={(val) => setRiderForm({...riderForm, confirmPassword: val})}
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
                  onChangeText={(val) => setRiderForm({...riderForm, vehicleNumber: val})}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Vehicle Type</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="MOTOR BIKE" 
                  value={riderForm.vehicleType}
                  onChangeText={(val) => setRiderForm({...riderForm, vehicleType: val})}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, loadingRider && { opacity: 0.7 }]} 
              onPress={handleAddRider}
              disabled={loadingRider}
            >
              {loadingRider ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Register Rider</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerLarge} />

          {/* --- ADD PRODUCT SECTION --- */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cart" size={24} color="#2E8B57" />
              <Text style={styles.sectionTitle}>Add Product</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g., Fresh Salmon" 
                value={productName}
                onChangeText={setProductName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price ($)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0.00" 
                keyboardType="numeric"
                value={productPrice}
                onChangeText={setProductPrice}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddProduct}>
              <Text style={styles.submitButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: {
    height: 70,
    backgroundColor: '#2E8B57',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...Platform.select({ android: { elevation: 4 }, ios: { shadowOpacity: 0.1 } })
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, color: '#666', marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#2E8B57',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  dividerLarge: { height: 25 },
});

export default ManagementPage;