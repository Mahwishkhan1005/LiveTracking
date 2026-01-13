import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location'; //
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; //
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const AssignRider = () => {
  const { orderId } = useLocalSearchParams(); 
  const router = useRouter();
  
  // State for location data and loading status
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  useEffect(() => {
    (async () => {
      // 1. Request foreground location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoadingLocation(false);
        return;
      }

      // 2. Get current position
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

  return (
    <SafeAreaView style={styles.container}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Rider</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* --- ASSIGNMENT INSTRUCTION CARD --- */}
      <View style={styles.subtitleCard}>
        <Ionicons name="bicycle-outline" size={20} color="#2E8B57" />
        <Text style={styles.subtitleText}>
          Assign a rider to your order ID: <Text style={styles.boldId}>#{orderId}</Text>
        </Text>
      </View>

      {/* --- GPS COORDINATES CARD --- */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <Ionicons name="location-outline" size={20} color="#2E8B57" />
          <Text style={styles.locationTitle}>Your Current GPS Location</Text>
        </View>
        
        {loadingLocation ? (
          <ActivityIndicator size="small" color="#2E8B57" style={{ marginTop: 10 }} />
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <View style={styles.coordsContainer}>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>LATITUDE</Text>
              <Text style={styles.coordValue}>{location?.coords.latitude.toFixed(6)}</Text>
            </View>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>LONGITUDE</Text>
              <Text style={styles.coordValue}>{location?.coords.longitude.toFixed(6)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* --- CONTENT AREA (Placeholder for Rider List) --- */}
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Available riders will be displayed here...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  header: {
    height: 100, 
    paddingTop: 40, 
    backgroundColor: '#2E8B57', //
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
  },
  headerTitle: { 
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  
  subtitleCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57', //
  },
  subtitleText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginLeft: 10,
  },
  boldId: {
    fontWeight: 'bold',
    color: '#2E8B57',
  },

  // Location Card Styling
  locationCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  coordsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  coordBox: {
    flex: 1,
  },
  coordLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: 'bold',
  },
  coordValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },

  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  }
});

export default AssignRider;