import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [cartCount, setCartCount] = useState(0); // For the cart badge
  const { addToCart, cartItems } = useCart(); // Use global state

  const router = useRouter();

  const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

  // --- FETCH PRODUCTS (Same API as Admin) ---
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = Platform.OS === 'web' 
        ? await AsyncStorage.getItem('userToken') 
        : await SecureStore.getItemAsync('userToken');

      // Using the same endpoint as adminDashboard.tsx
      const response = await axios.get('http://192.168.0.216:8080/api/admin/products/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Fetch Products Error:", error);
      Alert.alert("Error", "Could not load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

 const handleAddToCart = (item: any) => {
    addToCart(item); // Call global function
    Alert.alert("Added to Cart", `${item.pname} has been added.`);
  };

  const handleLogout = async () => {
    setDropdownVisible(false);
    try {
      await AsyncStorage.removeItem('userRole'); 
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem('userToken'); 
      } else {
        await SecureStore.deleteItemAsync('userToken'); 
      }
      router.replace('/'); 
    } catch (error) {
      console.error("Logout Error:", error);
    }
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
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.8)" />
          <TextInput
            style={styles.headerSearchInput}
            placeholder="Search products..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartIconContainer}>
            <Ionicons name="cart-outline" size={30} color="white" />
            {cartCount > 0 && (
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
        {/* WELCOME SECTION */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeLabel}>Hello! Fresh seafood awaits,</Text>
            <Text style={styles.userName}>Our Fresh Collection</Text>
          </View>
          <Ionicons name="fish-outline" size={40} color="#2E8B57" />
        </View>

        {/* PRODUCT GRID (Same layout as adminDashboard.tsx) */}
        {loading ? (
          <ActivityIndicator size="large" color="#2E8B57" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((item, index) => (
              <View key={item.pid || item.id || index} style={styles.productCard}>
                <Image 
                  source={{ uri: `${item.photo}?t=${refreshKey}` }} 
                  style={styles.productImage} 
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.pname}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {item.description || "Fresh and delicious."}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>₹{item.price}</Text>
                    {item.stock <= 0 && <Text style={styles.outOfStock}>Sold Out</Text>}
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.addButton, item.stock <= 0 && { backgroundColor: '#ccc' }]}
                    onPress={() => handleAddToCart(item)}
                    disabled={item.stock <= 0}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="white" />
                    <Text style={styles.addButtonText}> Add to Cart</Text>
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
    ...Platform.select({ android: { elevation: 6 }, ios: { shadowOpacity: 0.2 } }),
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: 'bold', color: 'white', marginLeft: 6 },
  headerSearchContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 8, 
    paddingHorizontal: 10, height: 45, marginHorizontal: 10 
  },
  headerSearchInput: { flex: 1, color: 'white', marginLeft: 8 },
  cartIconContainer: { position: 'relative' },
  badge: { 
    position: 'absolute', right: -5, top: -5, backgroundColor: 'orange', 
    borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' 
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  
  welcomeCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    margin: 15, padding: 20, borderRadius: 15, elevation: 3 
  },
  welcomeTextContainer: { flex: 1 },
  welcomeLabel: { fontSize: 14, color: '#666' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  productCard: { 
    backgroundColor: 'white', width: Platform.OS === 'web' ? '21%' : '46%', 
    marginHorizontal: '2%', borderRadius: 12, marginBottom: 20, overflow: 'hidden', 
    elevation: 3, shadowOpacity: 0.1 
  },
  productImage: { width: '100%', height: 130, resizeMode: 'cover' },
  productInfo: { padding: 12 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  productDescription: { fontSize: 12, color: '#777', marginTop: 4, height: 32 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  productPrice: { fontSize: 18, color: '#2E8B57', fontWeight: 'bold' },
  outOfStock: { color: 'red', fontSize: 12, fontWeight: 'bold' },
  addButton: { 
    backgroundColor: '#2E8B57', flexDirection: 'row', padding: 10, 
    borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 
  },
  addButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: { 
    position: 'absolute', top: 80, right: 20, backgroundColor: 'white', 
    borderRadius: 12, width: 160, paddingVertical: 8, elevation: 10 
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  dropdownText: { fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
});

export default UserDashboard;