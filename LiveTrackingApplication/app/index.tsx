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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<any>({});

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    let newErrors: any = {};
    let isValid = true;

    if (!email.trim() || !validateEmail(email)) {
      newErrors.email = "Valid email is required";
      isValid = false;
    }
    if (password.length < 4) {
      newErrors.password = "Password is too short";
      isValid = false;
    }

    if (!isLogin) {
      if (!name.trim()) {
        newErrors.name = "Name is required";
        isValid = false;
      }
      if (phone.length < 10) {
        newErrors.phone = "Enter a valid phone number";
        isValid = false;
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    const baseUrl = 'http://192.168.0.223:8082/api/auth';
    const endpoint = isLogin ? `${baseUrl}/login` : `${baseUrl}/signup`;
    const payload = isLogin 
      ? { gmail: email, password } 
      : { name, gmail: email, phone, password, confirmPassword };

    try {
      const response = await axios.post(endpoint, payload);
      const { token } = response.data;

      if (token) {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem('userToken', token);
        } else {
          await SecureStore.setItemAsync('userToken', token);
        }

        const decoded: any = jwtDecode(token);
        const userRole = decoded.role || decoded.roles;
        await AsyncStorage.setItem('userRole', userRole);

        Alert.alert("Success", isLogin ? "Logged in!" : "Account created!");
        
        if (userRole === 'ADMIN') router.replace('/adminDashboard');
        else if (userRole === 'RIDER') router.replace('/riderDashboard');
        else router.replace('/userDashboard');
      } else if (!isLogin) {
        Alert.alert("Success", "Account created successfully! Please login.");
        setIsLogin(true);
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F8A4" />
      
      {/* KeyboardAvoidingView ensures the card moves up when the keyboard opens.
          Using 'flex: 1' here is key for centering.
      */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={isLogin ? "lock-closed" : "person-add"} 
                size={50} 
                color="white" 
              />
            </View>

            <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>

            <View style={styles.inputWrapper}>
              {!isLogin && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={name}
                    onChangeText={setName}
                  />
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                  {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </>
              )}

              <TextInput
                style={styles.input}
                placeholder="E-mail address"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              {!isLogin && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                </>
              )}
            </View>

            <TouchableOpacity 
                style={styles.button} 
                onPress={handleSubmit} 
                disabled={loading}
                activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#36656B" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? 'LOG IN' : 'SIGN UP'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}>
                <Text style={styles.footerLink}>{isLogin ? "Sign up" : "Log in"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F8A4' // Light background to emphasize the floating effect
  },
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center', // Centers card vertically
    alignItems: 'center',     // Centers card horizontally
    paddingVertical: 40,      // Padding for small screens
    paddingHorizontal: 20
  },
  card: {
    // Responsive width logic
    width: Platform.OS === 'web' ? 400 : width * 0.88,
    backgroundColor: '#36656B',
    borderRadius: 30,
    padding: 35,
    alignItems: 'center',
    
    // "Floating" shadow effect
    ...Platform.select({
      android: { 
        elevation: 20, // Higher elevation for prominent shadow
      },
      ios: { 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 15 }, 
        shadowOpacity: 0.4, 
        shadowRadius: 25 
      },
      web: { 
        // Standard CSS shadow for web
        boxShadow: '0px 20px 40px rgba(0,0,0,0.4)',
      }
    }),
  },
  iconContainer: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 50,
    marginBottom: 15 
  },
  title: { 
    color: 'white', 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 25,
    letterSpacing: 1
  },
  inputWrapper: { 
    width: '100%', 
    marginBottom: 10 
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    color: 'white',
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 5,
  },
  errorText: { 
    color: '#FF6B6B', 
    fontSize: 12, 
    marginBottom: 10, 
    fontWeight: '500',
    alignSelf: 'flex-start' 
  },
  button: { 
    backgroundColor: 'white', 
    width: '100%', 
    paddingVertical: 18, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 20,
    // Add a small shadow to the button itself
    elevation: 3,
  },
  buttonText: { 
    color: '#36656B', 
    fontSize: 16, 
    fontWeight: 'bold',
    letterSpacing: 1.2
  },
  footer: { 
    marginTop: 25, 
    flexDirection: 'row' 
  },
  footerText: { 
    color: 'rgba(255, 255, 255, 0.7)', 
    fontSize: 14 
  },
  footerLink: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '700', 
    textDecorationLine: 'underline' 
  },
});

export default AuthScreen;