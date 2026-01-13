import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Modal,
  Platform,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');

const UserDashboard = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey] = useState(Date.now());
  const { addToCart, cartItems } = useCart(); 

  const router = useRouter();
  const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = Platform.OS === 'web' 
        ? await AsyncStorage.getItem('userToken') 
        : await SecureStore.getItemAsync('userToken');

      const response = await axios.get('http://192.168.0.223:8082/api/admin/products/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      Alert.alert("Error", "Could not load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    setDropdownVisible(false);

    const performLogout = async () => {
      try {
        // 1. Remove User Role
        await AsyncStorage.removeItem('userRole'); 
        
        // 2. Remove Token based on platform
        if (Platform.OS === 'web') {
          await AsyncStorage.removeItem('userToken'); 
        } else {
          await SecureStore.deleteItemAsync('userToken'); 
        }

        // 3. Redirect to login
        router.replace('/'); 
      } catch (error) {
        console.error("Logout Error:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to log out?")) {
        performLogout();
      }
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", style: "destructive", onPress: performLogout }
        ]
      );
    }
  };

  const handleAddToCart = (item: any) => {
    addToCart(item);
    Alert.alert("Success", `${item.pname} added to cart.`);
  };

  const filteredProducts = products.filter(item => 
    item.pname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Ionicons name="restaurant-outline" size={22} color="white" />
          <Text style={styles.brandName}>Seafood</Text> 
        </View>

        <View style={styles.headerSearchContainer}>
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartIconContainer}>
          <Ionicons name="cart-outline" size={30} color="white" />
          {cartItems.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleDropdown} activeOpacity={0.7} style={{ marginLeft: 10 }}>
          <Ionicons name="person-circle-outline" size={35} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: '#666' }}>Hello! Fresh seafood awaits,</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Our Fresh Collection</Text>
          </View>
          <Ionicons name="fish-outline" size={40} color="#2E8B57" />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2E8B57" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((item, index) => {
              const isInCart = cartItems.some(cartItem => cartItem.pid === (item.pid || item.id));
              
              return (
                <View key={item.pid || item.id || index} style={styles.productCard}>
                  <Image source={{ uri: `${item.photo}?t=${refreshKey}` }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{item.pname}</Text>
                    <Text style={styles.productPrice}>₹{item.price}</Text>
                    
                    <TouchableOpacity 
                      style={[styles.addButton, (item.stock <= 0 || isInCart) && { backgroundColor: '#ccc' }]}
                      onPress={() => handleAddToCart(item)}
                      disabled={item.stock <= 0 || isInCart}
                    >
                      <Text style={styles.addButtonText}>{isInCart ? "In Cart" : "Add to Cart"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* --- DROPDOWN MENU MODAL --- */}
      <Modal transparent visible={dropdownVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              
                            <TouchableOpacity onPress={() => { setDropdownVisible(false); router.push('/(USER)/myorders'); }} style={styles.dropdownItem}>
                              <Ionicons name="book-outline" size={20} color="#333" />
                              <Text style={styles.dropdownText}>Order Details</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setDropdownVisible(false); router.push('/(USER)/CurrentOrder'); }} style={styles.dropdownItem}>
                              <Ionicons name="car-outline" size={20} color="#333" />
                              <Text style={styles.dropdownText}>Track Order</Text>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            <TouchableOpacity onPress={handleLogout} style={styles.dropdownItem}>
                              <Ionicons name="log-out-outline" size={20} color="red" />
                              <Text style={[styles.dropdownText, { color: 'red' }]}>Logout</Text>
                            </TouchableOpacity>
              
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    height: 100, paddingTop: 30, backgroundColor: '#2E8B57', flexDirection: 'row', 
    alignItems: 'center', paddingHorizontal: 15,
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: 'bold', color: 'white', marginLeft: 6 },
  headerSearchContainer: { 
    flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 8, 
    paddingHorizontal: 10, height: 45, marginHorizontal: 10 
  },
  headerSearchInput: { flex: 1, color: 'white' },
  cartIconContainer: { position: 'relative' },
  badge: { 
    position: 'absolute', right: -5, top: -5, backgroundColor: 'orange', 
    borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' 
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  welcomeCard: { flexDirection: 'row', margin: 15, padding: 20, backgroundColor: 'white', borderRadius: 15, elevation: 3 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  productCard: { backgroundColor: 'white', width: Platform.OS === 'web' ? '21%' : '46%', marginHorizontal: '2%', borderRadius: 12, marginBottom: 20, overflow: 'hidden', elevation: 3 },
  productImage: { width: '100%', height: 130 },
  productInfo: { padding: 12 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productPrice: { fontSize: 18, color: '#2E8B57', fontWeight: 'bold', marginTop: 5 },
  addButton: { backgroundColor: '#2E8B57', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  addButtonText: { color: 'white', fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
  
  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: { 
    position: 'absolute', top: 80, right: 20, backgroundColor: 'white', 
    borderRadius: 12, width: 160, paddingVertical: 8, elevation: 10 
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  dropdownText: { fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
});

export default UserDashboard;