import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { Utensils } from 'lucide-react-native';

// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator/Web
// For physical device, replace with your PC's IP address (e.g., 192.168.1.5)
import { login } from '../lib/api';

export default function LoginPage({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email, password });

      // const data = await response.json(); // helper returns data directly

      if (data.success) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userName', data.user.name);
        await AsyncStorage.setItem('userEmail', data.user.email);
        await AsyncStorage.setItem('userId', String(data.user.id)); // Fixes Android crash: AsyncStorage only accepts strings
        await AsyncStorage.setItem('userRole', data.user.role);

        if (data.user.role === 'admin') {
          navigation.replace('AdminDashboard');
        } else {
          navigation.replace('Main');
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not connect to server. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Utensils color={COLORS.white} size={48} />
          </View>
          <Text style={styles.title}>Canteeria</Text>
          <Text style={styles.subtitle}>Campus Canteen App</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={COLORS.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1, justifyContent: 'center', padding: SPACING.l },
  logoContainer: { alignItems: 'center', marginBottom: SPACING.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.m,
    ...SHADOWS.medium
  },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  subtitle: { fontSize: 16, color: COLORS.textLight, marginTop: 4 },
  formContainer: { backgroundColor: COLORS.white, padding: SPACING.l, borderRadius: 16, ...SHADOWS.card },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.s },
  input: {
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.m, borderRadius: 8,
    marginBottom: SPACING.m, fontSize: 16, backgroundColor: '#FAFAFA'
  },
  button: {
    backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: 8,
    alignItems: 'center', marginTop: SPACING.s, ...SHADOWS.light
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.l },
  footerText: { color: COLORS.textLight },
  linkText: { color: COLORS.primary, fontWeight: 'bold' }
});