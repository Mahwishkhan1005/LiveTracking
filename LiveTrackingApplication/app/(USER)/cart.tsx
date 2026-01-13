import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import seafoodLogo from '../../assets/seafood.png';
import { useCart } from '../../context/CartContext';

const RAZORPAY_KEY_ID = 'rzp_test_RxJu5AW2ZIFxcL';

const CartPage = () => {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  // Aligned state with API payload values: 'ONLINE' or 'COD'
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE'); 
  const router = useRouter();

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setLoading(true);
    try {
      const token = Platform.OS === 'web'
        ? await AsyncStorage.getItem('userToken')
        : await SecureStore.getItemAsync('userToken');

      // 1. Prepare Payload for Common Endpoint
      const orderPayload = {
        paymentMode: paymentMethod,
        items: cartItems.map(item => ({
          productId: item.pid,
          quantity: item.quantity
        }))
      };

      // 2. Place Order (Common Endpoint)
      const orderResponse = await axios.post(
        'http://192.168.0.223:8082/api/user/orders',
        orderPayload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const backendOrderId = orderResponse.data.orderId;

      // 3. Conditional Logic based on Payment Mode
     // 3. Conditional Logic based on Payment Mode
      if (paymentMethod === 'ONLINE') {
        // --- PREPAID FLOW (Razorpay) ---
        const paymentResponse = await axios.post(
          `http://192.168.0.223:8082/api/payments/create/${backendOrderId}`,
          { amount: cartTotal * 100 },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        // 1. Destructure the keys exactly as they appear in your JSON
        const { razorpayOrderId } = paymentResponse.data;

        // 2. Validate that the Order ID exists before opening Razorpay
        if (!razorpayOrderId) {
          Alert.alert("Error", "Failed to retrieve Razorpay Order ID from backend.");
          setLoading(false);
          return;
        }

        const options = {
          description: 'Seafood Purchase',
          image: 'https://i.imgur.com/3g7nmJC.png',
          key: RAZORPAY_KEY_ID, 
          name: 'Seafood Store',
          order_id: razorpayOrderId, // Amount and Currency are fetched automatically from this ID
          prefill: { 
            email: 'user@example.com', 
            contact: '919999999999', 
            name: 'User' 
          },
          theme: { color: '#2E8B57' }
        };

        // Debug Log: Check this in your terminal/console to verify the data
        console.log("Razorpay Options:", options);

        try {
          const data = await RazorpayCheckout.open(options);
          Alert.alert("Success", `Payment Successful: ${data.razorpay_payment_id}`);
        } catch (paymentError: any) {
          console.error("Payment Error Details:", paymentError);
          Alert.alert("Payment Failed", paymentError.description || "The payment process was interrupted.");
          return; 
        }
      } else {
        // --- COD FLOW ---
        Alert.alert("Success", `Order #${backendOrderId} placed successfully!`);
      }

      // 4. Finalize
      if (clearCart) clearCart();
      router.replace('/(USER)/myorders');
    } catch (error: any) {
      console.error("Checkout Error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to process order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.cartCard}>
      <Image source={{ uri: item.photo }} style={styles.itemImage} />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.pname}</Text>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity onPress={() => updateQuantity(item.pid, -1)} style={styles.qtyBtn}>
            <Ionicons name="remove" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.pid, 1)} style={styles.qtyBtn}>
            <Ionicons name="add" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeFromCart(item.pid)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.pid.toString()}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View style={styles.bannerContainer}>
            <Image source={seafoodLogo} style={styles.bannerImage} />
          </View>
        )}
        ListFooterComponent={() => (
          <View>
            <View style={styles.missedContainer}>
              <Text style={styles.missedText}>Missed something?</Text>
              <TouchableOpacity style={styles.addMoreButton} onPress={() => router.back()}>
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addMoreButtonText}>Add More Items</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>
              
              <TouchableOpacity 
                style={[styles.methodCard, paymentMethod === 'COD' && styles.activeMethod]} 
                onPress={() => setPaymentMethod('COD')}
              >
                <Ionicons name="cash-outline" size={24} color={paymentMethod === 'COD' ? '#2E8B57' : '#666'} />
                <Text style={[styles.methodText, paymentMethod === 'COD' && styles.activeMethodText]}>Cash on Delivery</Text>
                {paymentMethod === 'COD' && <Ionicons name="checkmark-circle" size={20} color="#2E8B57" />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.methodCard, paymentMethod === 'ONLINE' && styles.activeMethod]} 
                onPress={() => setPaymentMethod('ONLINE')}
              >
                <Ionicons name="card-outline" size={24} color={paymentMethod === 'ONLINE' ? '#2E8B57' : '#666'} />
                <Text style={[styles.methodText, paymentMethod === 'ONLINE' && styles.activeMethodText]}>Online Payment (Razorpay)</Text>
                {paymentMethod === 'ONLINE' && <Ionicons name="checkmark-circle" size={20} color="#2E8B57" />}
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalPrice}>₹{cartTotal}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, loading && { opacity: 0.7 }]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.checkoutText}>
              {paymentMethod === 'COD' ? 'Place Order (COD)' : 'Pay Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    height: Platform.OS === 'web' ? 60 : (Platform.OS === 'android' ? 100 : 90),
    paddingTop: Platform.OS === 'web' ? 0 : (Platform.OS === 'android' ? 40 : 20),
    backgroundColor: '#2E8B57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  bannerContainer: { width: '100%', height: 180, backgroundColor: 'white', marginBottom: 10, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  listContent: { padding: 15 },
  cartCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 15, elevation: 2 },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  itemDetails: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemPrice: { fontSize: 14, color: '#2E8B57', marginVertical: 4 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  qtyBtn: { backgroundColor: '#eee', padding: 5, borderRadius: 4 },
  qtyText: { marginHorizontal: 15, fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { padding: 10 },
  missedContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 2, marginBottom: 20 },
  missedText: { fontSize: 16, color: '#333' },
  addMoreButton: { backgroundColor: 'black', flexDirection: 'row', padding: 10, borderRadius: 10 },
  addMoreButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 4 },
  paymentSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  activeMethod: { borderColor: '#2E8B57', backgroundColor: '#F0F9F4' },
  methodText: { flex: 1, marginLeft: 12, fontSize: 16, color: '#666' },
  activeMethodText: { color: '#2E8B57', fontWeight: 'bold' },
  footer: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  totalLabel: { fontSize: 18, color: '#666' },
  totalPrice: { fontSize: 22, fontWeight: 'bold' },
  checkoutBtn: { backgroundColor: '#2E8B57', padding: 18, borderRadius: 12, alignItems: 'center' },
  checkoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

export default CartPage;