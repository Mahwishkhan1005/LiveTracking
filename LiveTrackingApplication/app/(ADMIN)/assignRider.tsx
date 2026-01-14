import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const AssignRider = () => {
  const { orderId } = useLocalSearchParams(); 
  const router = useRouter();
  const API_BASE_URL = 'http://192.168.0.224:8081'; // Based on your dashboard config
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // --- NEW STATE FOR RIDERS ---
  const [riders, setRiders] = useState<any[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(true);

  // 1. Get Admin Location (Optional if backend uses constants, but good for UI)
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoadingLocation(false);
        return;
      }
      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      } catch (error) {
        setErrorMsg('Could not fetch location');
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  // 2. FETCH NEAREST RIDERS
  const fetchNearestRiders = async () => {
    setLoadingRiders(true);
    try {
      const token = Platform.OS === 'web' 
        ? await AsyncStorage.getItem('userToken') 
        : await SecureStore.getItemAsync('userToken');

      const response = await axios.get(`${API_BASE_URL}/api/admin/riders/nearest`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Assuming API returns an array of the top 10 riders
      setRiders(response.data);
    } catch (error) {
      console.error("Error fetching riders:", error);
      Alert.alert("Error", "Failed to fetch nearby riders.");
    } finally {
      setLoadingRiders(false);
    }
  };

  useEffect(() => {
    fetchNearestRiders();
  }, []);

  // --- HANDLE ASSIGNMENT ---
  const handleAssign = (rider: any) => {
    Alert.alert(
      "Confirm Assignment",
      `Assign Order #${orderId} to ${rider.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Assign", 
          onPress: () => {
            // Add your assignment logic here
            console.log(`Assigned ${orderId} to rider ${rider.id}`);
            router.back();
          } 
        }
      ]
    );
  };

  const renderRiderItem = ({ item }: { item: any }) => (
    <View style={styles.riderCard}>
      <View style={styles.riderInfo}>
        <View style={styles.riderAvatar}>
          <Ionicons name="bicycle" size={24} color="white" />
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.riderName}>{item.name}</Text>
          <Text style={styles.riderSub}>Vehicle: {item.vehicleNumber || 'N/A'}</Text>
          {/* Distance shown if backend provides it */}
          {item.distance && <Text style={styles.distanceText}>{item.distance}km away</Text>}
        </View>
      </View>
      <TouchableOpacity 
        style={styles.assignBtn} 
        onPress={() => handleAssign(item)}
      >
        <Text style={styles.assignBtnText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Rider</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subtitleCard}>
        <Ionicons name="bicycle-outline" size={20} color="#2E8B57" />
        <Text style={styles.subtitleText}>
          Select a rider for Order <Text style={styles.boldId}>#{orderId}</Text>
        </Text>
      </View>

      {/* GPS Location Info */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <Ionicons name="location-outline" size={20} color="#2E8B57" />
          <Text style={styles.locationTitle}>Admin Focus Location</Text>
        </View>
        {loadingLocation ? (
          <ActivityIndicator size="small" color="#2E8B57" />
        ) : (
          <View style={styles.coordsContainer}>
            <Text style={styles.coordValue}>Lat: {location?.coords.latitude.toFixed(4)}</Text>
            <Text style={styles.coordValue}>Long: {location?.coords.longitude.toFixed(4)}</Text>
          </View>
        )}
      </View>

      {/* RIDER LIST SECTION */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Top 10 Nearest Riders</Text>
        <TouchableOpacity onPress={fetchNearestRiders}>
          <Ionicons name="refresh" size={20} color="#2E8B57" />
        </TouchableOpacity>
      </View>

      {loadingRiders ? (
        <ActivityIndicator size="large" color="#2E8B57" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={riders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRiderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>No active riders nearby</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { height: 100, paddingTop: 40, backgroundColor: '#2E8B57', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  
  subtitleCard: {
    backgroundColor: 'white', flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 15, marginTop: 15, padding: 15, borderRadius: 12,
    elevation: 3, borderLeftWidth: 4, borderLeftColor: '#2E8B57',
  },
  subtitleText: { fontSize: 15, color: '#333', marginLeft: 10 },
  boldId: { fontWeight: 'bold', color: '#2E8B57' },

  locationCard: { backgroundColor: 'white', marginHorizontal: 15, marginTop: 10, padding: 15, borderRadius: 12, elevation: 2 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  locationTitle: { fontSize: 12, fontWeight: 'bold', color: '#666', marginLeft: 8, textTransform: 'uppercase' },
  coordsContainer: { flexDirection: 'row' },
  coordValue: { fontSize: 14, color: '#333', marginRight: 15, fontWeight: '600' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20, alignItems: 'center' },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  riderCard: { 
    backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 2, shadowOpacity: 0.1
  },
  riderInfo: { flexDirection: 'row', alignItems: 'center' },
  riderAvatar: { backgroundColor: '#2E8B57', padding: 8, borderRadius: 25 },
  riderName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  riderSub: { fontSize: 12, color: '#666' },
  distanceText: { fontSize: 12, color: '#2E8B57', fontWeight: 'bold', marginTop: 2 },
  
  assignBtn: { backgroundColor: '#2E8B57', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8 },
  assignBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10 }
});

export default AssignRider;