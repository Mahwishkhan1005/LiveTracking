import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform, // 1. Import Platform
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const FloatingLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please enter both email and password");
    return;
  }

  setLoading(true);

  try {
    const response = await axios.post('http://192.168.0.189:8082/api/auth/login', {
      gmail: email,
      password: password,
    });

    // CHANGE: Destructure 'accessToken' instead of 'token'
    const { accessToken } = response.data; 

    if (accessToken) {
      // 1. Save Token (Web uses AsyncStorage, Android uses SecureStore)
      if (Platform.OS === 'web') {
          await AsyncStorage.setItem('userToken', accessToken);
      } else {
          await SecureStore.setItemAsync('userToken', accessToken);
      }

      // 2. Decode & Save Role
      const decoded = jwtDecode<any>(accessToken);
      const userRole = decoded.role || decoded.roles;

      if (userRole) {
        await AsyncStorage.setItem('userRole', userRole);

        // Define target path based on role
        
        if (userRole === 'ADMIN') {
          router.replace('/adminDashboard');
        } else if (userRole === 'RIDER') {
          router.replace('/riderDashboard');
        }else {
          router.replace('/userDashboard');
        }

        if (Platform.OS === 'web') {
          // Web Navigation Fix: Use a timeout to ensure storage is written
          setTimeout(() => {
           
          }, 150);
        } else {
          // Mobile Flow
          Alert.alert("Success", "Login Successful");
          
        }
      }
    }
  } catch (error: any) {
    console.error("Login Error:", error);
    Alert.alert("Login Failed", error.response?.data?.message || "Check your credentials.");
  } finally {
    setLoading(false);
  }
};
  return (
    <SafeAreaView style={styles.container}>
      {/* 2. Style the Android StatusBar */}
      <StatusBar barStyle="dark-content" backgroundColor="#F0F8A4" />
      
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed-outline" size={50} color="white" />
        </View>

        <Text style={styles.title}>Login</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="E-mail address"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#36656B" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8A4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    // 3. Responsive width for Android/iOS vs Web
    width: Platform.OS === 'web' ? width * 0.3 : width * 0.85,
    // Removed fixed height to allow content to fit naturally
    backgroundColor: '#36656B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    // 4. Android elevation vs iOS shadow
    ...Platform.select({
        android: {
            elevation: 12,
        },
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
        },
        web: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
        }
    }),
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 28, // Slightly larger for mobile visibility
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    color: 'white',
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: 'white',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12, // More standard Android button shape
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#36656B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 25,
    flexDirection: 'row',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  footerLink: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default FloatingLogin;