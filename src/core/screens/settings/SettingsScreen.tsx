import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

const WEEG_BLUE = '#1a6fe8';
const WEEG_ORANGE = '#e87c1a';

export function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const settingsSections = [
    {
      title: 'Notifications',
      icon: 'notifications-outline',
      color: WEEG_BLUE,
      settings: [
        { label: 'Push Notifications', desc: 'Receive alerts on your device', value: notifications, setter: setNotifications },
        { label: 'Email Alerts', desc: 'Get critical alerts via email', value: emailAlerts, setter: setEmailAlerts },
      ],
    },
    {
      title: 'Appearance',
      icon: 'color-palette-outline',
      color: Colors.purple600,
      settings: [
        { label: 'Dark Mode', desc: 'Switch to dark theme', value: darkMode, setter: setDarkMode },
      ],
    },
    {
      title: 'Data',
      icon: 'cloud-outline',
      color: Colors.success,
      settings: [
        { label: 'Auto Sync', desc: 'Automatically sync data in background', value: autoSync, setter: setAutoSync },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
          <Text style={styles.pageSubtitle}>Customize your Weeg experience</Text>
        </View>

        {/* Profile Summary Card */}
        <View style={[styles.profileCard, Shadow.md]}>
          <LinearGradient colors={[WEEG_BLUE, WEEG_ORANGE]} style={styles.profileAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.profileAvatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, si) => (
          <View key={si} style={[styles.settingsCard, Shadow.sm]}>
            <View style={styles.settingsHeader}>
              <View style={[styles.settingsIcon, { backgroundColor: section.color + '20' }]}>
                <Ionicons name={section.icon as any} size={18} color={section.color} />
              </View>
              <Text style={styles.settingsTitle}>{section.title}</Text>
            </View>
            {section.settings.map((setting, i) => (
              <View key={i} style={[styles.settingRow, i > 0 && styles.settingRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{setting.label}</Text>
                  <Text style={styles.settingDesc}>{setting.desc}</Text>
                </View>
                <Switch
                  value={setting.value}
                  onValueChange={setting.setter}
                  trackColor={{ false: Colors.gray200, true: WEEG_BLUE }}
                  thumbColor={Colors.white}
                />
              </View>
            ))}
          </View>
        ))}

        {/* Navigation Links */}
        <View style={[styles.settingsCard, Shadow.sm]}>
          {[
            { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: Colors.warning },
            { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.info },
            { icon: 'document-text-outline', label: 'Terms & Privacy', color: Colors.gray500 },
            { icon: 'information-circle-outline', label: 'About Weeg', color: Colors.gray500 },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={[styles.navRow, i > 0 && styles.navRowBorder]}>
              <View style={[styles.navIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.navLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.gray300} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, Shadow.sm]}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Weeg v1.0.0 · Where Data Finds Balance</Text>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  content: { padding: Spacing.base, paddingBottom: 32 },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: Colors.foreground },
  pageSubtitle: { fontSize: 13, color: Colors.gray500, marginTop: 2 },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.gray100 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 22, fontWeight: '800', color: Colors.white },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  profileEmail: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  roleBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: WEEG_BLUE },

  settingsCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.gray100 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  settingsIcon: { width: 32, height: 32, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { fontSize: 15, fontWeight: '700', color: Colors.foreground },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  settingRowBorder: { borderTopWidth: 1, borderTopColor: Colors.gray50 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: Colors.foreground },
  settingDesc: { fontSize: 12, color: Colors.gray500, marginTop: 2 },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  navRowBorder: { borderTopWidth: 1, borderTopColor: Colors.gray50 },
  navIcon: { width: 34, height: 34, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.foreground },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, borderWidth: 1, borderColor: Colors.red100, marginBottom: 20 },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.danger },

  versionText: { fontSize: 11, color: Colors.gray400, textAlign: 'center' },
});
