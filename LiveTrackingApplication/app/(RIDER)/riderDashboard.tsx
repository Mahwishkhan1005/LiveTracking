import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Ensure axios is installed
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

const RiderDashboard = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isActive, setIsActive] = useState(true); // Tracks Rider Status
  const [statusLoading, setStatusLoading] = useState(false); // UI feedback for API call
  
  const router = useRouter();

  // --- TOGGLE RIDER STATUS ---
  const toggleStatus = async (value: boolean) => {
    setStatusLoading(true);
    try {
      const token = Platform.OS === 'web' 
        ? await AsyncStorage.getItem('userToken') 
        : await SecureStore.getItemAsync('userToken');

      const response = await axios.put(
        'http://192.168.0.223:8082/api/rider/status',
        { isActive: value },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        setIsActive(value);
        if (Platform.OS === 'web') {
            console.log("Status updated successfully");
        } else {
            // Optional: Alert.alert("Success", "Rider status updated successfully");
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update status. Please try again.");
    } finally {
      setStatusLoading(false);
    }
  };

  const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

  const handleLogout = () => {
    setDropdownVisible(false);
    const performLogout = async () => {
      try {
        await AsyncStorage.removeItem('userRole'); 
        if (Platform.OS === 'web') {
          await AsyncStorage.removeItem('userToken'); 
        } else {
          await SecureStore.deleteItemAsync('userToken'); 
        }
        router.replace('/'); 
      } catch (error) {
        console.error("Error during logout:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to log out?")) performLogout();
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout }
      ]);
    }
  };

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
            placeholder="Search orders..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity onPress={toggleDropdown} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={35} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- THANK YOU CARD & STATUS TOGGLE --- */}
        <View style={styles.thankYouCard}>
          <View style={styles.thankYouContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={24} color="white" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.thankYouTitle}>Thank you for being our</Text>
              <Text style={styles.thankYouSubtitle}>delivery partners!</Text>
            </View>
          </View>

          {/* STATUS TOGGLE SECTION */}
          <View style={styles.statusSection}>
             <View>
                <Text style={styles.statusLabel}>Availability Status</Text>
                <Text style={[styles.statusIndicator, { color: isActive ? '#4ADE80' : '#FB7185' }]}>
                    {isActive ? '● Online & Active' : '● Offline'}
                </Text>
             </View>
             {statusLoading ? (
                 <ActivityIndicator color="white" size="small" />
             ) : (
                <Switch
                    trackColor={{ false: "#767577", true: "#2E8B57" }}
                    thumbColor={isActive ? "#f4f3f4" : "#f4f3f4"}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={toggleStatus}
                    value={isActive}
                />
             )}
          </View>
        </View>

        {/* --- CONTENT AREA --- */}
        <View style={styles.content}>
          <Text style={styles.welcomeText}>Order Pipeline</Text>
          {searchQuery ? <Text style={styles.searchStatus}>Results for: {searchQuery}</Text> : null}
        </View>
      </ScrollView>

      {/* --- DROPDOWN MENU --- */}
      <Modal transparent visible={dropdownVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
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
    height: 120,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: '#2E8B57',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 10,
    ...Platform.select({
        android: { elevation: 6 },
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
        web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
    }),
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: 'bold', color: 'white', marginLeft: 6 },
  headerSearchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    borderRadius: 8, paddingHorizontal: 10, height: 45, marginHorizontal: 10,
  },
  headerSearchInput: { flex: 1, color: 'white', marginLeft: 8 },
  
  thankYouCard: {
    backgroundColor: '#36656B',
    margin: 15,
    padding: 20,
    borderRadius: 20,
    elevation: 5,
  },
  thankYouContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 25,
  },
  textContainer: {
    marginLeft: 15,
  },
  thankYouTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  thankYouSubtitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },
  
  // --- NEW STATUS SECTION STYLING ---
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
  },
  statusLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusIndicator: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },

  content: { padding: 20, alignItems: 'center' },
  welcomeText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  searchStatus: { marginTop: 10, color: '#666' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 100 : 110,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 180,
    paddingVertical: 8,
    elevation: 10,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  dropdownText: { fontSize: 16, fontWeight:'bold', marginLeft: 12, color: '#333' },
});

export default RiderDashboard;