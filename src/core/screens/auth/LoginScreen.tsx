import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../../constants/theme';

const WEEG_BLUE = '#1a6fe8';
const WEEG_ORANGE = '#e87c1a';

export function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        Alert.alert('Login Failed', result.message);
      }
    } catch (e) {
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type: 'admin' | 'manager' | 'agent') => {
    const creds = {
      admin: { email: 'admin@fasi.com', password: 'admin123' },
      manager: { email: 'john@company.com', password: 'manager123' },
      agent: { email: 'sarah@company.com', password: 'agent123' },
    };
    setEmail(creds[type].email);
    setPassword(creds[type].password);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoArea}>
            <Image
              source={require('../../assets/logo.jpeg')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.logoSub}>Where Data Finds Balance</Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, Shadow.lg]}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.gray400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithToggle]}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={loading ? [Colors.gray300, Colors.gray400] : [WEEG_BLUE, WEEG_ORANGE]}
                style={styles.submitBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="white" />
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Demo Credentials */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Demo Credentials</Text>
              <View style={styles.demoButtons}>
                {(['admin', 'manager', 'agent'] as const).map(role => (
                  <TouchableOpacity key={role} onPress={() => fillDemo(role)} style={styles.demoChip}>
                    <Text style={styles.demoChipText}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.demoCredsList}>
                <Text style={styles.demoCred}>Admin: admin@fasi.com / admin123</Text>
                <Text style={styles.demoCred}>Manager: john@company.com / manager123</Text>
                <Text style={styles.demoCred}>Agent: sarah@company.com / agent123</Text>
              </View>
            </View>

            {/* Signup Link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign up as Manager</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eff6ff' },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingVertical: 32, justifyContent: 'center' },

  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoImg: { width: 220, height: 80, marginBottom: 8 },
  logoSub: { fontSize: 13, color: Colors.gray500, textAlign: 'center' },

  card: { backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: 24, borderWidth: 1, borderColor: Colors.gray100 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.foreground, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.gray500, marginBottom: 24 },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.foreground, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.gray200 },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15, color: Colors.foreground },
  inputWithToggle: { paddingRight: 0 },
  eyeBtn: { padding: 14 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: BorderRadius.lg },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  demoBox: { marginTop: 20, backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, padding: 14 },
  demoTitle: { fontSize: 12, fontWeight: '700', color: Colors.foreground, marginBottom: 10 },
  demoButtons: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  demoChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  demoChipText: { fontSize: 12, fontWeight: '600', color: WEEG_BLUE },
  demoCred: { fontSize: 11, color: Colors.gray500, lineHeight: 18 },
  demoCredsList: { gap: 2 },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signupText: { fontSize: 14, color: Colors.gray500 },
  signupLink: { fontSize: 14, fontWeight: '600', color: WEEG_BLUE },
});
