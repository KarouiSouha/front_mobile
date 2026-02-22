import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AlertsScreen } from '../screens/alerts/AlertsScreen';
import { ControlScreen } from '../screens/control/ControlScreen';
import { AdminScreen } from '../screens/admin/AdminScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

import { Colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { alerts } from '../lib/mockData';

const Tab = createBottomTabNavigator();

// Weeg brand colors
const WEEG_BLUE = '#1a6fe8';
const WEEG_ORANGE = '#e87c1a';

function SearchModal({ visible, onClose }: any) {
  const [q, setQ] = useState('');
  const suggestions = ['MacBook Pro', 'iPhone 15 Pro', 'Samsung Galaxy', 'AirPods Pro', 'Tech Solutions Inc', 'Invoice #247'];
  const filtered = q ? suggestions.filter(s => s.toLowerCase().includes(q.toLowerCase())) : suggestions;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.white }}>
        <View style={h.searchModalBar}>
          <Ionicons name="search" size={18} color={Colors.gray400} />
          <TextInput
            autoFocus value={q} onChangeText={setQ}
            placeholder="Search products, customers, invoices..."
            placeholderTextColor={Colors.gray400}
            style={{ flex: 1, fontSize: 15, color: Colors.foreground }}
          />
          <TouchableOpacity onPress={() => { setQ(''); onClose(); }}>
            <Text style={{ fontSize: 14, color: WEEG_BLUE, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 12, color: Colors.gray500, marginBottom: 10, fontWeight: '600' }}>
            {q ? 'Results' : 'Recent Searches'}
          </Text>
          {filtered.map((s, i) => (
            <TouchableOpacity key={i} style={h.searchItem}>
              <Ionicons name="search-outline" size={15} color={Colors.gray400} />
              <Text style={{ fontSize: 14, color: Colors.foreground }}>{s}</Text>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={{ fontSize: 13, color: Colors.gray400, textAlign: 'center', marginTop: 24 }}>No results for "{q}"</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Header({ title, navigation }: { title: string; navigation?: any }) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const pendingAlerts = alerts.filter(a => a.status === 'pending').length;

  return (
    <View style={h.header}>
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} />
      {/* Left: Logo */}
      <View style={h.left}>
        <Image
          source={require('../assets/logo.jpeg')}
          style={h.logoImg}
          resizeMode="contain"
        />
      </View>
      {/* Right: Search + Notifs + User */}
      <View style={h.right}>
        <TouchableOpacity style={h.iconBtn} onPress={() => setSearchOpen(true)}>
          <Ionicons name="search-outline" size={20} color={Colors.gray500} />
        </TouchableOpacity>
        <TouchableOpacity style={h.iconBtn} onPress={() => navigation?.navigate('Alerts')}>
          <Ionicons name="notifications-outline" size={20} color={Colors.gray500} />
          {pendingAlerts > 0 && (
            <View style={h.badge}>
              <Text style={h.badgeTxt}>{pendingAlerts > 9 ? '9+' : pendingAlerts}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={h.userRow}>
          <LinearGradient colors={[WEEG_BLUE, WEEG_ORANGE]} style={h.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={h.avatarTxt}>{(user?.name || 'J').charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <View>
            <Text style={h.userName} numberOfLines={1}>{user?.name || 'John Manager'}</Text>
            <Text style={h.userRole}>{user?.role || 'manager'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  left: { flexDirection: 'row', alignItems: 'center' },
  logoImg: { width: 100, height: 36 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6, position: 'relative' },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeTxt: { fontSize: 8, color: '#fff', fontWeight: '800' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 11, fontWeight: '700', color: Colors.foreground, maxWidth: 70 },
  userRole: { fontSize: 9, color: Colors.gray500, textTransform: 'capitalize' },
  searchModalBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  searchItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.gray50 },
});

// Screens wrapped with Header
function withHeader(Screen: React.ComponentType<any>, title: string) {
  return function WrappedScreen(props: any) {
    return (
      <View style={{ flex: 1 }}>
        <Header title={title} navigation={props.navigation} />
        <Screen {...props} />
      </View>
    );
  };
}

const HomeSreen = withHeader(DashboardScreen, 'Dashboard');
const AlertsWrapped = withHeader(AlertsScreen, 'Alerts');
const ControlWrapped = withHeader(ControlScreen, 'Control');
const AdminWrapped = withHeader(AdminScreen, 'Admin');
const ProfileWrapped = withHeader(ProfileScreen, 'Profile');

export function MainNavigator() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const pendingAlerts = alerts.filter(a => a.status === 'pending').length;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.gray100,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 8,
          height: 65,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: WEEG_BLUE,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeSreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsWrapped}
        options={{
          tabBarLabel: 'Alerts',
          tabBarBadge: pendingAlerts > 0 ? pendingAlerts : undefined,
          tabBarBadgeStyle: { backgroundColor: '#dc2626', fontSize: 9, minWidth: 16, height: 16 },
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'warning' : 'warning-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Control"
        component={ControlWrapped}
        options={{
          tabBarLabel: 'Control',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={22} color={color} />
          ),
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminWrapped}
          options={{
            tabBarLabel: 'Admin',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={22} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileWrapped}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
