/**
 * src/core/components/BiometricSetupPrompt.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen modal shown once after a successful password login when:
 *   - Device supports biometrics
 *   - Biometrics are enrolled
 *   - Biometric login is NOT yet enabled in WEEG
 *   - OS-enrolled fingerprint count ≤ MAX_FINGERPRINTS
 *
 * The user can enable or dismiss.
 *
 * Changes:
 *   - enable() now returns { success, errorCode, error }; handled here.
 *   - Shows fingerprint slot count in the feature list.
 *   - If too many fingerprints are enrolled at OS level, the Enable button
 *     is replaced by a warning and the user must fix it in device settings.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Easing, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadow } from '../constants/theme';
import { BiometricService, BiometricCapability, MAX_FINGERPRINTS } from '../lib/biometricService';

const WEEG_BLUE   = '#1a6fe8';
const WEEG_ORANGE = '#e87c1a';

interface BiometricSetupPromptProps {
  visible: boolean;
  capability: BiometricCapability;
  email: string;
  password: string;
  onEnable: () => void;
  onDismiss: () => void;
}

export function BiometricSetupPrompt({
  visible,
  capability,
  email,
  password,
  onEnable,
  onDismiss,
}: BiometricSetupPromptProps) {
  const [enabling, setEnabling] = useState(false);

  // ── Animation ──────────────────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const biometricLabel = 'Fingerprint';
  const iconName = 'finger-print-outline';

  // Check if too many fingerprints are already enrolled
  const tooManyFingerprints = capability.enrolledCount > MAX_FINGERPRINTS;

  const handleEnable = async () => {
    if (tooManyFingerprints) return; // button disabled, safety guard

    setEnabling(true);
    const result = await BiometricService.enable(email, password);
    setEnabling(false);

    if (!result.success) {
      if (result.errorCode === 'too_many_fingerprints') {
        Alert.alert(
          'Too Many Fingerprints',
          result.error ?? `You can register a maximum of ${MAX_FINGERPRINTS} fingerprints.`,
        );
      } else {
        Alert.alert('Error', result.error ?? 'Could not enable biometrics. Please try again.');
      }
      return;
    }

    onEnable();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[S.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            S.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={S.handle} />

          {/* Icon */}
          <View style={S.iconArea}>
            <Animated.View style={[S.iconRing, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={tooManyFingerprints ? ['#ef4444', '#f97316'] : [WEEG_BLUE, WEEG_ORANGE]}
                style={S.iconGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={tooManyFingerprints ? 'warning-outline' : (iconName as any)}
                  size={40}
                  color="#fff"
                />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Content */}
          <Text style={S.title}>
              {tooManyFingerprints
                ? 'Too Many Fingerprints'
                : `Enable ${biometricLabel} Login`}
          </Text>
          <Text style={S.subtitle}>
            {tooManyFingerprints
              ? `WEEG allows up to ${MAX_FINGERPRINTS} fingerprints per account. You currently have ${capability.enrolledCount} enrolled. Remove fingerprints in your device settings to continue.`
              : `Sign in instantly with your fingerprint — no password needed.`}
          </Text>

          {/* Feature bullets — only when not blocked */}
          {!tooManyFingerprints && (
            <View style={S.featureList}>
              {[
                { icon: 'flash-outline',              text: 'One-touch instant access' },
                { icon: 'shield-checkmark-outline',   text: 'Secured by your device hardware' },
                { icon: 'finger-print-outline',       text: 'Your fingerprint never leaves this device' },
                { icon: 'finger-print-outline',       text: `Up to ${MAX_FINGERPRINTS} fingerprints per account` },
              ].map((f, i) => (
                <View key={i} style={S.featureRow}>
                  <View style={S.featureIconWrap}>
                    <Ionicons name={f.icon as any} size={14} color={WEEG_BLUE} />
                  </View>
                  <Text style={S.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CTA */}
          {tooManyFingerprints ? (
            // Blocked state — only dismiss
            <>
              <View style={S.blockedBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#b45309" />
                <Text style={S.blockedTxt}>
                  Go to Settings → Biometrics & Security and remove a fingerprint, then come back to enable biometric login.
                </Text>
              </View>
              <TouchableOpacity onPress={onDismiss} style={S.secondaryBtn} activeOpacity={0.7}>
                <Text style={S.secondaryBtnTxt}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleEnable} activeOpacity={0.85} disabled={enabling}>
                <LinearGradient
                  colors={[WEEG_BLUE, WEEG_ORANGE]}
                  style={[S.primaryBtn, enabling && { opacity: 0.7 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name={iconName as any} size={18} color="#fff" />
                  <Text style={S.primaryBtnTxt}>
                    {enabling ? 'Enabling…' : `Enable ${biometricLabel}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={onDismiss} style={S.secondaryBtn} activeOpacity={0.7}>
                <Text style={S.secondaryBtnTxt}>Not now</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={S.footNote}>
            You can enable or disable this anytime in Profile → Security.
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,13,26,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    ...Shadow.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border2,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 24,
  },
  iconArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconRing: {
    padding: 6,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(26,92,240,0.15)',
  },
  iconGrad: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featureList: {
    backgroundColor: Colors.surface2,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(26,92,240,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    color: Colors.text2,
    fontWeight: '500',
    flex: 1,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(180,83,9,0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.2)',
    padding: 14,
    marginBottom: 16,
  },
  blockedTxt: {
    flex: 1,
    fontSize: 13,
    color: '#b45309',
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    marginBottom: 12,
  },
  primaryBtnTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border2,
    backgroundColor: Colors.surface2,
    marginBottom: 16,
  },
  secondaryBtnTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text2,
  },
  footNote: {
    fontSize: 11,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 16,
  },
});