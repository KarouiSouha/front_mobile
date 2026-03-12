/**
 * SignupScreen.tsx — Inscription Manager connectée au backend Django WEEG
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, Image, Modal, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const WEEG_BLUE = '#1a6fe8';
const WEEG_ORANGE = '#e87c1a';

// ─── Données statiques ────────────────────────────────────────────────────────

const INDUSTRIES = [
  'Agriculture', 'Automotive', 'Banking & Finance', 'Construction',
  'Education', 'Energy & Utilities', 'Food & Beverage', 'Healthcare',
  'Hospitality & Tourism', 'Information Technology', 'Insurance',
  'Logistics & Supply Chain', 'Manufacturing', 'Media & Entertainment',
  'Mining & Resources', 'Pharmaceutical', 'Real Estate', 'Retail & E-commerce',
  'Telecommunications', 'Textile & Apparel', 'Transportation', 'Other',
];

const COUNTRIES_CITIES: Record<string, string[]> = {
  Algeria: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Sétif', 'Sidi Bel Abbès', 'Biskra', 'Tébessa'],
  Morocco: ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tangier', 'Agadir', 'Meknès', 'Oujda'],
  Tunisia: ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Aryanah'],
  France: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Strasbourg'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar'],
  Egypt: ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'],
  'United Kingdom': ['London', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield', 'Manchester'],
  Germany: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart'],
  Other: ['Other'],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  industry: string;
  country: string;
  city: string;
  currentErp: string;
  password: string;
  passwordConfirm: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  country?: string;
  city?: string;
  password?: string;
  passwordConfirm?: string;
}

// ─── PickerModal ──────────────────────────────────────────────────────────────
// Défini HORS du composant principal pour éviter le remontage

function PickerModal({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pickerStyles.option, item === selected && pickerStyles.optionSelected]}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={[pickerStyles.optionText, item === selected && pickerStyles.optionTextSelected]}>
                {item}
              </Text>
              {item === selected && <Ionicons name="checkmark" size={18} color={WEEG_BLUE} />}
            </TouchableOpacity>
          )}
          style={{ maxHeight: 400 }}
        />
      </View>
    </Modal>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
// Défini HORS du composant principal — si défini à l'intérieur, il est recréé
// à chaque render ce qui démonte/remonte le TextInput et perd le focus.

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  icon: string;
  error?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  editable?: boolean;
  optional?: boolean;
  rightIcon?: React.ReactNode;
}

function Field({
  label, value, onChangeText, placeholder, icon, error,
  keyboardType = 'default', autoCapitalize = 'none',
  secureTextEntry = false, editable = true, optional = false, rightIcon,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}
        {optional && <Text style={styles.optionalTag}> (optionnel)</Text>}
      </Text>
      <View style={[styles.inputWrapper, error ? styles.inputError : undefined]}>
        <Ionicons name={icon as any} size={18} color={Colors.gray400} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray400}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          editable={editable}
        />
        {rightIcon}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── SelectField ──────────────────────────────────────────────────────────────
// Défini HORS du composant principal

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  icon: string;
  onPress: () => void;
  error?: string;
  disabled?: boolean;
}

function SelectField({ label, value, placeholder, icon, onPress, error, disabled = false }: SelectFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputWrapper, error ? styles.inputError : undefined, disabled && styles.inputDisabled]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Ionicons name={icon as any} size={18} color={Colors.gray400} style={styles.inputIcon} />
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.gray400} style={{ paddingRight: 12 }} />
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export function SignupScreen({ navigation }: any) {
  const { signup } = useAuth();

  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    companyName: '', industry: '', country: '', city: '',
    currentErp: '', password: '', passwordConfirm: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [industryModal, setIndustryModal] = useState(false);
  const [countryModal, setCountryModal] = useState(false);
  const [cityModal, setCityModal] = useState(false);

  const update = (field: keyof FormData) => (value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'country') next.city = '';
      return next;
    });
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const availableCities = form.country ? (COUNTRIES_CITIES[form.country] || ['Other']) : [];

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = 'Prénom requis';
    if (!form.lastName.trim()) e.lastName = 'Nom requis';
    if (!form.email.trim()) e.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide';
    if (!form.companyName.trim()) e.companyName = 'Nom de société requis';
    if (!form.industry) e.industry = 'Secteur requis';
    if (!form.country) e.country = 'Pays requis';
    if (!form.city) e.city = 'Ville requise';
    if (!form.password) e.password = 'Mot de passe requis';
    else if (form.password.length < 8) e.password = 'Au moins 8 caractères';
    if (form.password !== form.passwordConfirm) e.passwordConfirm = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await signup({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        companyName: form.companyName,
        industry: form.industry,
        country: form.country,
        city: form.city,
        currentErp: form.currentErp || undefined,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
      });
      if (result.success) {
        Alert.alert('✓ Compte créé !', result.message, [
          { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Erreur', result.message);
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoArea}>
            <Image source={require('../../assets/logo.jpeg')} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.logoSub}>Where Data Finds Balance</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, Shadow.lg]}>
            <Text style={styles.cardTitle}>Create Manager Account</Text>
            <Text style={styles.cardSubtitle}>Your account will be reviewed by an admin</Text>

            {/* Prénom / Nom — inline TextInput direct, pas via Field, pour éviter tout souci de ref */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>First Name *</Text>
                <View style={[styles.inputWrapper, errors.firstName ? styles.inputError : undefined]}>
                  <Ionicons name="person-outline" size={18} color={Colors.gray400} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="John"
                    placeholderTextColor={Colors.gray400}
                    value={form.firstName}
                    onChangeText={update('firstName')}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
                {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last Name *</Text>
                <View style={[styles.inputWrapper, errors.lastName ? styles.inputError : undefined]}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 12 }]}
                    placeholder="Doe"
                    placeholderTextColor={Colors.gray400}
                    value={form.lastName}
                    onChangeText={update('lastName')}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
                {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>
            </View>

            {/* Email */}
            <Field
              label="Email Address *"
              value={form.email}
              onChangeText={update('email')}
              placeholder="john.doe@company.com"
              icon="mail-outline"
              keyboardType="email-address"
              error={errors.email}
              editable={!loading}
            />

            {/* Téléphone */}
            <Field
              label="Phone Number"
              value={form.phone}
              onChangeText={update('phone')}
              placeholder="+213 6X XXX XXXX"
              icon="call-outline"
              keyboardType="phone-pad"
              error={errors.phone}
              editable={!loading}
              optional
            />

            {/* Société */}
            <Field
              label="Company Name *"
              value={form.companyName}
              onChangeText={update('companyName')}
              placeholder="Your Company Inc."
              icon="business-outline"
              autoCapitalize="words"
              error={errors.companyName}
              editable={!loading}
            />

            {/* Secteur */}
            <SelectField
              label="Industry *"
              value={form.industry}
              placeholder="Select your industry"
              icon="briefcase-outline"
              onPress={() => setIndustryModal(true)}
              error={errors.industry}
            />

            {/* Pays */}
            <SelectField
              label="Country *"
              value={form.country}
              placeholder="Select your country"
              icon="globe-outline"
              onPress={() => setCountryModal(true)}
              error={errors.country}
            />

            {/* Ville */}
            <SelectField
              label="City *"
              value={form.city}
              placeholder={form.country ? 'Select your city' : 'Select a country first'}
              icon="location-outline"
              onPress={() => setCityModal(true)}
              error={errors.city}
              disabled={!form.country}
            />

            {/* ERP */}
            <Field
              label="Current ERP"
              value={form.currentErp}
              onChangeText={update('currentErp')}
              placeholder="e.g. SAP, Oracle, Odoo..."
              icon="layers-outline"
              autoCapitalize="words"
              editable={!loading}
              optional
            />

            {/* Mot de passe */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password *</Text>
              <View style={[styles.inputWrapper, errors.password ? styles.inputError : undefined]}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={Colors.gray400}
                  value={form.password}
                  onChangeText={update('password')}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
              {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirmer mot de passe */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={[styles.inputWrapper, errors.passwordConfirm ? styles.inputError : undefined]}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor={Colors.gray400}
                  value={form.passwordConfirm}
                  onChangeText={update('passwordConfirm')}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
              </View>
              {!!errors.passwordConfirm && <Text style={styles.errorText}>{errors.passwordConfirm}</Text>}
            </View>

            {/* Info Banner */}
            <View style={styles.roleBanner}>
              <View style={styles.roleBannerIcon}>
                <Ionicons name="information-circle-outline" size={18} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleBannerTitle}>Manager Account</Text>
                <Text style={styles.roleBannerText}>
                  After creation, your account will be pending review. An admin will approve or reject your request. You'll receive a confirmation email.
                </Text>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity onPress={handleSignup} disabled={loading} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={loading ? [Colors.gray300, Colors.gray400] : [WEEG_BLUE, WEEG_ORANGE]}
                style={styles.submitBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color="white" size="small" />
                  : <>
                    <Ionicons name="person-add-outline" size={20} color="white" />
                    <Text style={styles.submitBtnText}>Create Manager Account</Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.signinRow}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signinLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals — en dehors du ScrollView pour ne pas perturber le focus */}
      <PickerModal
        visible={industryModal}
        title="Select Industry"
        options={INDUSTRIES}
        selected={form.industry}
        onSelect={update('industry')}
        onClose={() => setIndustryModal(false)}
      />
      <PickerModal
        visible={countryModal}
        title="Select Country"
        options={Object.keys(COUNTRIES_CITIES)}
        selected={form.country}
        onSelect={update('country')}
        onClose={() => setCountryModal(false)}
      />
      <PickerModal
        visible={cityModal}
        title="Select City"
        options={availableCities}
        selected={form.city}
        onSelect={update('city')}
        onClose={() => setCityModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 8, borderRadius: 8 },
  optionSelected: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextSelected: { color: WEEG_BLUE, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eff6ff' },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.base, paddingVertical: 32 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoImg: { width: 220, height: 80, marginBottom: 8 },
  logoSub: { fontSize: 13, color: Colors.gray500, textAlign: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: 24, borderWidth: 1, borderColor: Colors.gray100 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.foreground, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: Colors.gray500, marginBottom: 24 },
  row: { flexDirection: 'row', marginBottom: 0 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.foreground, marginBottom: 8 },
  optionalTag: { fontSize: 12, fontWeight: '400', color: Colors.gray400 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.gray200 },
  inputError: { borderColor: Colors.red500 },
  inputDisabled: { opacity: 0.5 },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15, color: Colors.foreground },
  selectText: { flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15, color: Colors.foreground },
  selectPlaceholder: { color: Colors.gray400 },
  eyeBtn: { padding: 14 },
  errorText: { fontSize: 11, color: Colors.red500, marginTop: 4 },
  roleBanner: { flexDirection: 'row', gap: 12, backgroundColor: '#eff6ff', borderRadius: BorderRadius.lg, padding: 14, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 4 },
  roleBannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: WEEG_BLUE, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  roleBannerTitle: { fontSize: 13, fontWeight: '700', color: Colors.foreground, marginBottom: 4 },
  roleBannerText: { fontSize: 11, color: Colors.gray500, lineHeight: 18 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: BorderRadius.lg },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signinText: { fontSize: 14, color: Colors.gray500 },
  signinLink: { fontSize: 14, fontWeight: '600', color: WEEG_BLUE },
});