/**
 * SettingsScreen.tsx — WEEG v2
 * Design : luxury-utility · dark architectural header · refined cards
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { SessionService } from '../../lib/api';

// ─── Design tokens (shared avec ProfileScreen) ────────────────────────────────
const T = {
  navy:        '#0a1628',
  navyMid:     '#0f2040',
  blue:        '#1a6fe8',
  blueDim:     '#1a4a8a',
  orange:      '#e87c1a',
  white:       '#ffffff',
  surface:     '#f7f9fc',
  card:        '#ffffff',
  border:      '#e8edf5',
  borderLight: '#f0f4f9',
  text:        '#0d1b2e',
  textSub:     '#64748b',
  textMuted:   '#94a3b8',
  green:       '#10b981',
  greenBg:     '#d1fae5',
  red:         '#ef4444',
  redBg:       '#fee2e2',
  blueBg:      '#eff6ff',
};

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, desc, value, onChange, isLast = false }: {
  label: string; desc: string; value: boolean;
  onChange: (v: boolean) => void; isLast?: boolean;
}) {
  return (
    <View style={[S.toggleRow, !isLast && S.toggleRowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={S.toggleLabel}>{label}</Text>
        <Text style={S.toggleDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#e2e8f0', true: T.blue + 'cc' }}
        thumbColor={value ? T.blue : T.white}
        ios_backgroundColor="#e2e8f0"
      />
    </View>
  );
}

// ─── Nav Row ──────────────────────────────────────────────────────────────────
function NavRow({ icon, label, color, onPress, desc, isLast = false, danger = false }: {
  icon: string; label: string; color: string; onPress: () => void;
  desc?: string; isLast?: boolean; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={[S.navRow, !isLast && S.navRowBorder]}
      onPress={onPress} activeOpacity={0.7}>
      <View style={[S.navIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={17} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.navLabel, danger && { color: T.red }]}>{label}</Text>
        {desc && <Text style={S.navDesc}>{desc}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={14}
        color={danger ? '#fca5a5' : T.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ icon, color, title, children }: {
  icon: string; color: string; title: string; children: React.ReactNode;
}) {
  return (
    <View style={S.card}>
      <View style={S.cardHeader}>
        <View style={[S.cardIconWrap, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
        <Text style={S.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [emailAlerts,   setEmailAlerts]   = useState(true);
  const [pushAlerts,    setPushAlerts]    = useState(true);
  const [autoSync,      setAutoSync]      = useState(true);

  const handleLogout = () =>
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);

  const handleLogoutAll = () =>
    Alert.alert('Log Out All Devices', 'This will close all active sessions on all your devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out All', style: 'destructive', onPress: async () => {
          const res = await SessionService.logoutAll();
          if (res.ok) {
            Alert.alert('Done', `${res.data?.sessions_revoked || 0} session(s) closed.`);
            await logout();
          } else Alert.alert('Error', res.error || 'An error occurred.');
        },
      },
    ]);

  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.surface }} edges={['bottom']}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={S.headerCircle1} />
        <View style={S.headerCircle2} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Avatar compact */}
          <LinearGradient colors={[T.blue, T.orange]} style={S.headerAvatar}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: T.white }}>{initials}</Text>
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text style={S.headerName} numberOfLines={1}>{user?.name || '—'}</Text>
            <Text style={S.headerEmail} numberOfLines={1}>{user?.email || '—'}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
              <View style={[S.headerBadge, { backgroundColor: T.orange + 'bb' }]}>
                <Text style={S.headerBadgeTxt}>{(user?.role || 'user').toUpperCase()}</Text>
              </View>
              {user?.companyName && (
                <View style={[S.headerBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={S.headerBadgeTxt}>{user.companyName}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Profile')}
            style={S.profileArrowBtn}>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={S.headerStats}>
          <View style={S.headerStat}>
            <Ionicons name="notifications-outline" size={13} color={notifications ? T.blue : T.textMuted} />
            <Text style={[S.headerStatTxt, { color: notifications ? T.blue : T.textMuted }]}>
              {notifications ? 'Notifs On' : 'Notifs Off'}
            </Text>
          </View>
          <View style={S.headerStatDivider} />
          <View style={S.headerStat}>
            <Ionicons name="cloud-outline" size={13} color={autoSync ? T.green : T.textMuted} />
            <Text style={[S.headerStatTxt, { color: autoSync ? T.green : T.textMuted }]}>
              {autoSync ? 'Auto-sync' : 'Manual sync'}
            </Text>
          </View>
          <View style={S.headerStatDivider} />
          <View style={S.headerStat}>
            <Ionicons name="shield-checkmark-outline" size={13}
              color={user?.isVerified ? T.green : T.textMuted} />
            <Text style={[S.headerStatTxt, { color: user?.isVerified ? T.green : T.textMuted }]}>
              {user?.isVerified ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <SectionCard icon="notifications-outline" color={T.blue} title="Notifications">
          <ToggleRow label="Push Notifications" desc="Receive alerts on your device"
            value={notifications} onChange={setNotifications} />
          <ToggleRow label="Email Alerts" desc="Get critical alerts via email"
            value={emailAlerts} onChange={setEmailAlerts} />
          <ToggleRow label="Critical Push Alerts" desc="Immediate notifications for emergencies"
            value={pushAlerts} onChange={setPushAlerts} isLast />
        </SectionCard>

        {/* ── Data & Sync ───────────────────────────────────────────────── */}
        <View style={[S.card, { marginTop: 12 }]}>
          <View style={S.cardHeader}>
            <View style={[S.cardIconWrap, { backgroundColor: T.green + '15' }]}>
              <Ionicons name="cloud-outline" size={16} color={T.green} />
            </View>
            <Text style={S.cardTitle}>Data & Sync</Text>
          </View>
          <ToggleRow label="Auto Sync" desc="Automatically sync data in background"
            value={autoSync} onChange={setAutoSync} isLast />
        </View>

        {/* ── Account ───────────────────────────────────────────────────── */}
        <View style={[S.card, { marginTop: 12 }]}>
          <View style={S.cardHeader}>
            <View style={[S.cardIconWrap, { backgroundColor: T.blueBg }]}>
              <Ionicons name="person-outline" size={16} color={T.blue} />
            </View>
            <Text style={S.cardTitle}>Account</Text>
          </View>
          <NavRow icon="person-outline" label="My Profile" color={T.blue}
            onPress={() => navigation.navigate('Profile')} />
          <NavRow icon="shield-checkmark-outline" label="Privacy & Security" color="#f59e0b"
            onPress={() => navigation.navigate('Profile', { tab: 'security' })} />
          <NavRow icon="key-outline" label="Permissions" color="#7c3aed"
            onPress={() => navigation.navigate('Profile', { tab: 'permissions' })}
            isLast />
        </View>

        {/* ── Support & Legal ───────────────────────────────────────────── */}
        <View style={[S.card, { marginTop: 12 }]}>
          <View style={S.cardHeader}>
            <View style={[S.cardIconWrap, { backgroundColor: T.surface }]}>
              <Ionicons name="help-circle-outline" size={16} color={T.textSub} />
            </View>
            <Text style={S.cardTitle}>Support & Legal</Text>
          </View>
          <NavRow icon="help-circle-outline" label="Help & Support" color={T.textSub}
            onPress={() => Alert.alert('Help', 'Contact: support@weeg.app')} />
          <NavRow icon="document-text-outline" label="Terms & Privacy Policy" color={T.textSub}
            onPress={() => {}} />
          <NavRow icon="information-circle-outline" label="About WEEG" color={T.textSub}
            desc="Financial Analytics & System Intelligence · v1.0.0"
            onPress={() => Alert.alert('WEEG', 'Financial Analytics & System Intelligence\nVersion 1.0.0')}
            isLast />
        </View>

        {/* ── Session Management ────────────────────────────────────────── */}
        <View style={[S.card, { marginTop: 12 }]}>
          <View style={S.cardHeader}>
            <View style={[S.cardIconWrap, { backgroundColor: T.redBg }]}>
              <Ionicons name="log-out-outline" size={16} color={T.red} />
            </View>
            <Text style={S.cardTitle}>Session Management</Text>
          </View>
          <NavRow icon="log-out-outline" label="Log Out" color={T.red}
            onPress={handleLogout} danger />
          <NavRow icon="phone-portrait-outline" label="Log Out All Devices" color={T.red}
            desc="Closes all active sessions everywhere"
            onPress={handleLogoutAll} danger isLast />
        </View>

        {/* Version footer */}
        <View style={S.footer}>
          <View style={S.footerDot} />
          <Text style={S.footerTxt}>WEEG v1.0.0</Text>
          <View style={S.footerDot} />
          <Text style={S.footerTxt}>Where Data Finds Balance</Text>
          <View style={S.footerDot} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Header
  header: {
    backgroundColor: T.navy,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    borderWidth: 1, borderColor: 'rgba(26,111,232,0.1)',
    top: -50, right: -40,
  },
  headerCircle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 1, borderColor: 'rgba(232,124,26,0.08)',
    bottom: 10, left: -20,
  },
  headerAvatar: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerName:  { fontSize: 16, fontWeight: '800', color: T.white, letterSpacing: -0.2 },
  headerEmail: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  headerBadge: {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99,
  },
  headerBadgeTxt: { fontSize: 9, fontWeight: '800', color: T.white, letterSpacing: 0.5 },
  profileArrowBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats strip
  headerStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingVertical: 10,
    paddingHorizontal: 16, marginTop: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headerStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' },
  headerStatDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerStatTxt: { fontSize: 11, fontWeight: '600' },

  // Cards
  card: {
    backgroundColor: T.card,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#0a1628',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 12,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.borderLight,
  },
  cardIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: T.text },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
  },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: T.borderLight },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: T.text },
  toggleDesc:  { fontSize: 11, color: T.textMuted, marginTop: 2 },

  // Nav
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  navRowBorder: { borderBottomWidth: 1, borderBottomColor: T.borderLight },
  navIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: { fontSize: 13, fontWeight: '600', color: T.text },
  navDesc:  { fontSize: 11, color: T.textMuted, marginTop: 1 },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24, paddingBottom: 8,
  },
  footerDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: T.textMuted },
  footerTxt: { fontSize: 11, color: T.textMuted },
});