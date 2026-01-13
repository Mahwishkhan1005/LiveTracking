import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const CurrentOrder = () => {
  const router = useRouter();
  const [orderStatus, setOrderStatus] = useState('Out for Delivery');

  return (
    <SafeAreaView style={styles.container}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* --- LIVE TRACKING INFO CARD --- */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="navigate-circle-outline" size={30} color="#2E8B57" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Live Tracking Active</Text>
            <Text style={styles.infoSubtitle}>Track the live location of your order here</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{orderStatus}</Text>
        </View>
      </View>

      {/* --- MAP CONTAINER --- */}
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={60} color="#ccc" />
        <Text style={styles.mapText}>Live Map Integration Coming Soon</Text>
        <Text style={styles.mapSubText}>WebSocket & Google Maps will be rendered here</Text>
      </View>

      {/* --- RIDER DETAILS FOOTER --- */}
      <View style={styles.footer}>
        <View style={styles.riderRow}>
          <View style={styles.riderIcon}>
            <Ionicons name="person" size={24} color="white" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.riderName}>Delivery Partner</Text>
            <Text style={styles.riderSubText}>Assigned to your order</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
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
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoTextContainer: { marginLeft: 15 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  infoSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  
  statusBadge: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  statusText: { color: '#2E8B57', fontWeight: 'bold', fontSize: 12 },

  mapPlaceholder: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#eee',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  mapText: { marginTop: 15, fontSize: 16, fontWeight: '600', color: '#999' },
  mapSubText: { fontSize: 12, color: '#bbb', marginTop: 5 },

  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  riderRow: { flexDirection: 'row', alignItems: 'center' },
  riderIcon: { backgroundColor: '#2E8B57', padding: 10, borderRadius: 50 },
  riderName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  riderSubText: { fontSize: 12, color: '#777' },
  callButton: { backgroundColor: '#2E8B57', padding: 12, borderRadius: 12 },
});

export default CurrentOrder;