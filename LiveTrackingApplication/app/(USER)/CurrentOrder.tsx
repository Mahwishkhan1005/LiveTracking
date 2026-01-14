import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const CurrentOrder = () => {
  const router = useRouter();
  const { orderId, userId } = useLocalSearchParams();
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Updated API URL to match your provided endpoint
  const API_BASE_URL = 'http://192.168.0.224:8081';

  useEffect(() => {
    const fetchSpecificOrder = async () => {
      setLoading(true);
      try {
        const token = Platform.OS === 'web'
          ? await AsyncStorage.getItem('userToken')
          : await SecureStore.getItemAsync('userToken');

        const response = await axios.get(`${API_BASE_URL}/api/user/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setOrderData(response.data);
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchSpecificOrder();
  }, [orderId]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2E8B57" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderId}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- ORDER STATUS CARD --- */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={24} color="#2E8B57" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Order Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {orderData?.status?.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.infoRow, { marginTop: 15 }]}>
            <Ionicons name="wallet-outline" size={24} color="#2E8B57" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Payment Method</Text>
              <Text style={styles.infoSubtitle}>{orderData?.paymentMode}</Text>
            </View>
          </View>
        </View>

        {/* --- PRODUCT ITEMS CARD --- */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Items Ordered</Text>
          {orderData?.items.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>Product ID: {item.productId}</Text>
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{orderData?.totalAmount}</Text>
          </View>
        </View>

        {/* --- TRACKING PLACEHOLDER --- */}
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={40} color="#ccc" />
          <Text style={styles.mapText}>Live Tracking for Order #{orderId}</Text>
          <Text style={styles.mapSubText}>Rider ID: {orderData?.riderId || 'Awaiting Assignment'}</Text>
        </View>
      </ScrollView>

      {/* --- RIDER FOOTER --- */}
      <View style={styles.footer}>
        <View style={styles.riderRow}>
          <View style={styles.riderIcon}>
            <Ionicons name="person" size={24} color="white" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.riderName}>
              {orderData?.riderId ? "Rider Assigned" : "Finding Rider..."}
            </Text>
            <Text style={styles.riderSubText}>Your Delivery Partner</Text>
          </View>
          {orderData?.riderId && (
            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="call" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    height: Platform.OS === 'android' ? 100 : 80,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    backgroundColor: '#2E8B57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  infoCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoTextContainer: { marginLeft: 15 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  infoSubtitle: { fontSize: 14, color: '#666' },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusText: { color: '#2E8B57', fontWeight: 'bold', fontSize: 12 },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  itemText: { fontSize: 14, color: '#333', fontWeight: '500' },
  itemQuantity: { fontSize: 14, color: '#666', fontWeight: '500' },
  itemPrice: { fontSize: 14, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#2E8B57' },
  mapPlaceholder: {
    height: 200,
    margin: 15,
    backgroundColor: '#eee',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  mapText: { marginTop: 10, fontSize: 14, fontWeight: 'bold', color: '#999' },
  mapSubText: { fontSize: 12, color: '#bbb', fontWeight: 'bold' },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 20,
  },
  riderRow: { flexDirection: 'row', alignItems: 'center' },
  riderIcon: { backgroundColor: '#2E8B57', padding: 10, borderRadius: 50 },
  riderName: { fontSize: 16, fontWeight: 'bold' },
  riderSubText: { fontSize: 12, color: '#777' },
  callButton: { backgroundColor: '#2E8B57', padding: 12, borderRadius: 12 },
});

export default CurrentOrder;