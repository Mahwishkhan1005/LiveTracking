import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for role and web token removal
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store'; // Added for mobile token removal
import React, { useState } from 'react';
import {
    Alert, // Added for logout confirmation
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const AdminDashboard = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

  // --- LOGOUT HANDLER WITH TOKEN REMOVAL ---
  // --- LOGOUT HANDLER WITH WEB & MOBILE ALERTS ---
  const handleLogout = () => {
    setDropdownVisible(false);

    // Shared logout logic to clear storage and navigate
    const performLogout = async () => {
      try {
        // 1. Remove the User Role (Both platforms)
        await AsyncStorage.removeItem('userRole'); 
        
        // 2. Remove the JWT Token based on the platform
        if (Platform.OS === 'web') {
          await AsyncStorage.removeItem('userToken'); 
        } else {
          await SecureStore.deleteItemAsync('userToken'); 
        }

        // 3. Navigate back to Login screen
        router.replace('/'); 
      } catch (error) {
        console.error("Error during logout:", error);
      }
    };

    if (Platform.OS === 'web') {
      // --- WEB CONFIRMATION ---
      // Use native browser confirm for the Web platform
      const confirmed = window.confirm("Are you sure you want to log out?");
      if (confirmed) {
        performLogout();
      }
    } else {
      // --- MOBILE CONFIRMATION ---
      // Use React Native Alert for Android and iOS
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
            placeholder="Search..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity onPress={toggleDropdown} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={35} color="white" />
        </TouchableOpacity>
      </View>

      {/* --- DROPDOWN MENU --- */}
      {dropdownVisible && (
        <Modal
          transparent={true}
          visible={dropdownVisible}
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => { setDropdownVisible(false); router.push('/manage'); }}
                >
                  <Ionicons name="person-add-outline" size={20} color="#333" />
                  <Text style={styles.dropdownText}>Manage here</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={handleLogout} 
                >
                  <Ionicons name="log-out-outline" size={20} color="red" />
                  <Text style={[styles.dropdownText, { color: 'red' }]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* --- CONTENT AREA --- */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Admin Dashboard</Text>
        {searchQuery ? <Text style={styles.searchStatus}>Results for: {searchQuery}</Text> : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    height: 70,
    backgroundColor: '#2E8B57', // Sea Green
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    ...Platform.select({
      android: { elevation: 6 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 6,
  },
  headerSearchContainer: {
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginHorizontal: 10,
  },
  headerSearchInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 60 : 80,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 180,
    paddingVertical: 8,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight:'bold',
    marginLeft: 12,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchStatus: {
    marginTop: 10,
    color: '#666',
  },
});

export default AdminDashboard;