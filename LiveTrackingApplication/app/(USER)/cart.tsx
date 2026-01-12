import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import seafoodLogo from '../../assets/seafood.png';
import { useCart } from '../../context/CartContext';

const CartPage = () => {
  const { cartItems, removeFromCart, updateQuantity, cartTotal } = useCart(); 
  const router = useRouter(); //

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

  // NEW: Component for the "Missed something?" section
  const ListFooter = () => (
    <View style={styles.missedContainer}>
      <Text style={styles.missedText}>Missed something?</Text>
      <TouchableOpacity 
        style={styles.addMoreButton} 
        onPress={() => router.back()} // Navigates back to userDashboard
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addMoreButtonText}>Add More Items</Text>
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

      <View style={styles.bannerContainer}>
        <Image source={seafoodLogo} style={styles.bannerImage} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.back()}>
            <Text style={styles.shopBtnText}>Go Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.pid.toString()}
            renderItem={renderItem}
            ListFooterComponent={ListFooter} // ADDS SECTION BELOW CARDS
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalPrice}>₹{cartTotal}</Text>
            </View>
            <TouchableOpacity 
              style={styles.checkoutBtn}
             // onPress={() => router.push('/payment')}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    // Reduced height and removed paddingTop for web
    height: Platform.OS === 'web' ? 60 : (Platform.OS === 'android' ? 100 : 90), 
    paddingTop: Platform.OS === 'web' ? 0 : (Platform.OS === 'android' ? 40 : 20), 
    backgroundColor: '#2E8B57', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    zIndex: 10,
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  bannerContainer: {
    width: '100%',
    // Increased height for web to 350 for more prominence
    height: Platform.OS === 'web' ? 200 : 250, 
    backgroundColor: 'white',
    marginBottom: 10,
    overflow: 'hidden',
  },
  // Ensure height is 100% to fill the new container height
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  listContent: { padding: 15 },
  cartCard: { 
    flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, 
    padding: 12, marginBottom: 15, alignItems: 'center', elevation: 2 
  },
  itemImage: { width: 80, height: 80, borderRadius: 8, resizeMode: 'cover' },
  itemDetails: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemPrice: { fontSize: 14, color: '#2E8B57', marginVertical: 4 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  qtyBtn: { backgroundColor: '#eee', padding: 5, borderRadius: 4 },
  qtyText: { marginHorizontal: 15, fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { padding: 10 },

  missedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginTop: 5,
    marginBottom: 20,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  missedText: { fontSize: 16, color: '#333', fontWeight: '500' },
  addMoreButton: {
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addMoreButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 4, fontSize: 14 },

  footer: { 
    backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, elevation: 10 
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  totalLabel: { fontSize: 18, color: '#666', fontWeight: '500' },
  totalPrice: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  checkoutBtn: { 
    backgroundColor: '#2E8B57', padding: 18, borderRadius: 12, alignItems: 'center' 
  },
  checkoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#999', marginTop: 10 },
  shopBtn: { marginTop: 20, backgroundColor: '#2E8B57', padding: 12, borderRadius: 8 },
  shopBtnText: { color: 'white', fontWeight: 'bold' }
});

export default CartPage;