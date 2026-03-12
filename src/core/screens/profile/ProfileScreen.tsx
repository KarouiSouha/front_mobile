/**
 * ProfileScreen.tsx — WEEG v2
 * Design : luxury-utility · dark architectural header · refined cards
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { UserService, SessionService } from '../../lib/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:        '#0a1628',
  navyMid:     '#0f2040',
  blue:        '#1a6fe8',
  blueDim:     '#1a4a8a',
  orange:      '#e87c1a',
  orangeDim:   '#c4681500',
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
  amber:       '#f59e0b',
  amberBg:     '#fef3c7',
  blueBg:      '#eff6ff',
};

type Tab = 'account' | 'security' | 'permissions';

// ─── Sous-composants ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, accent }: {
  icon: string; label: string; value: string; accent?: string;
}) {
  return (
    <View style={P.infoRow}>
      <View style={P.infoIconWrap}>
        <Ionicons name={icon as any} size={14} color={T.blue} />
      </View>
      <Text style={P.infoLabel}>{label}</Text>
      <Text style={[P.infoValue, accent ? { color: accent, fontWeight: '700' } : {}]}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
      <Text style={{ fontSize: 10, fontWeight: '800', color: T.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        {text}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
    </View>
  );
}

function FieldInput({ label, value, onChange, placeholder, icon, secure, showToggle, editable = true, keyboardType }: any) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={P.fieldLabel}>{label}</Text>
      <View style={[P.inputBox, !editable && { backgroundColor: T.surface, opacity: 0.7 }]}>
        <Ionicons name={icon} size={15} color={T.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.textMuted}
          secureTextEntry={secure && !show}
          editable={editable}
          keyboardType={keyboardType || 'default'}
          style={P.input}
        />
        {showToggle && (
          <TouchableOpacity onPress={() => setShow(p => !p)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={17} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { user, logout, changePassword, refreshProfile } = useAuth();

  const availableTabs: Tab[] = user?.role === 'agent'
    ? ['account', 'security', 'permissions']
    : ['account', 'security'];
  const [tab, setTab] = useState<Tab>('account');

  // ── Edit profile ──────────────────────────────────────────────────────────
  const [editing, setEditing]     = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setFirstName(user?.name?.split(' ')[0] || '');
    setLastName(user?.name?.split(' ').slice(1).join(' ') || '');
    setPhone(user?.phoneNumber || '');
  }, [user]);

  const handleSaveProfile = async () => {
    if (!firstName.trim()) { Alert.alert('Error', 'First name is required.'); return; }
    setSavingProfile(true);
    const res = await UserService.updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phone.trim() || undefined,
    });
    setSavingProfile(false);
    if (res.ok) { await refreshProfile(); setEditing(false); Alert.alert('✓ Updated', 'Profile saved.'); }
    else Alert.alert('Error', res.error || 'Failed to update profile.');
  };

  // ── Change password ───────────────────────────────────────────────────────
  const [oldPw, setOldPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw]   = useState(false);

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) { Alert.alert('Error', 'Please fill all fields.'); return; }
    if (newPw.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error', 'Passwords do not match.'); return; }
    setSavingPw(true);
    const result = await changePassword(oldPw, newPw, confirmPw);
    setSavingPw(false);
    if (result.success) { Alert.alert('✓ Password Changed', result.message); setOldPw(''); setNewPw(''); setConfirmPw(''); }
    else Alert.alert('Error', result.message);
  };

  // ── Sessions ──────────────────────────────────────────────────────────────
  const [sessions, setSessions]         = useState<any[]>([]);
  const [loadingSessions, setLoading]   = useState(false);

  useEffect(() => { if (tab === 'security') loadSessions(); }, [tab]);

  const loadSessions = async () => {
    setLoading(true);
    const res = await SessionService.getActiveSessions();
    if (res.ok) setSessions(res.data?.sessions || []);
    setLoading(false);
  };

  const handleRevokeSession = (id: string) => {
    Alert.alert('Revoke Session', 'This device will be logged out.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
          const res = await SessionService.revokeSession(id);
          if (res.ok) setSessions(p => p.filter(s => s.id !== id));
          else Alert.alert('Error', res.error || 'Failed.');
      }},
    ]);
  };

  const handleLogoutAll = () => {
    Alert.alert('Log Out All Devices', 'All sessions will be closed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out All', style: 'destructive', onPress: async () => {
          const res = await SessionService.logoutAll();
          if (res.ok) await logout();
          else Alert.alert('Error', res.error || 'Failed.');
      }},
    ]);
  };

  const roleColors: Record<string, string> = {
    admin: T.red, manager: T.blue, agent: T.green,
  };
  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase();

  // ── Tab config ────────────────────────────────────────────────────────────
  const tabCfg: Record<Tab, { icon: string; label: string }> = {
    account:     { icon: 'person-outline',    label: 'Account'     },
    security:    { icon: 'shield-outline',    label: 'Security'    },
    permissions: { icon: 'key-outline',       label: 'Permissions' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.surface }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={P.header}>
        {/* Geometric decoration */}
        <View style={P.headerCircle1} />
        <View style={P.headerCircle2} />

        {/* Avatar */}
        <View style={P.avatarRing}>
          <LinearGradient colors={[T.blue, T.orange]} style={P.avatar}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={P.avatarTxt}>{initials}</Text>
          </LinearGradient>
        </View>

        <Text style={P.headerName}>{user?.name || '—'}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 }}>
          <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.55)" />
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{user?.email || '—'}</Text>
        </View>

        {/* Badges */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <View style={[P.badge, { backgroundColor: T.orange + 'cc' }]}>
            <Ionicons name="briefcase-outline" size={10} color="#fff" />
            <Text style={P.badgeTxt}>{(user?.role || 'user').toUpperCase()}</Text>
          </View>
          {user?.companyName && (
            <View style={[P.badge, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
              <Ionicons name="business-outline" size={10} color="#fff" />
              <Text style={P.badgeTxt}>{user.companyName}</Text>
            </View>
          )}
          <View style={[P.badge, {
            backgroundColor: user?.status === 'active' || user?.status === 'approved'
              ? T.green + 'bb' : T.amber + 'bb',
          }]}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />
            <Text style={P.badgeTxt}>{(user?.status || 'active').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <View style={P.tabBar}>
        {availableTabs.map(id => {
          const active = tab === id;
          const cfg = tabCfg[id];
          return (
            <TouchableOpacity key={id} style={[P.tabBtn, active && P.tabBtnActive]}
              onPress={() => setTab(id)}>
              <Ionicons name={cfg.icon as any} size={15}
                color={active ? T.blue : T.textMuted} />
              <Text style={[P.tabLabel, active && P.tabLabelActive]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* ═══════════════════ ACCOUNT TAB ═══════════════════ */}
        {tab === 'account' && (
          <>
            {/* My Information */}
            <View style={P.card}>
              <View style={P.cardHeader}>
                <View style={P.cardIconWrap}>
                  <Ionicons name="person-outline" size={16} color={T.blue} />
                </View>
                <Text style={P.cardTitle}>My Information</Text>
                <TouchableOpacity
                  style={[P.editPill, editing && P.editPillCancel]}
                  onPress={() => editing ? (
                    setFirstName(user?.name?.split(' ')[0] || ''),
                    setLastName(user?.name?.split(' ').slice(1).join(' ') || ''),
                    setPhone(user?.phoneNumber || ''),
                    setEditing(false)
                  ) : setEditing(true)}
                >
                  <Ionicons name={editing ? 'close-outline' : 'pencil-outline'} size={13}
                    color={editing ? T.textSub : T.blue} />
                  <Text style={[P.editPillTxt, editing && { color: T.textSub }]}>
                    {editing ? 'Cancel' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!editing ? (
                <View style={{ marginTop: 4 }}>
                  <InfoRow icon="person-outline"   label="Name"  value={user?.name || '—'} />
                  <InfoRow icon="mail-outline"      label="Email" value={user?.email || '—'} />
                  <InfoRow icon="briefcase-outline" label="Role"  value={user?.role || '—'}
                    accent={roleColors[user?.role || '']} />
                  {/* Phone & Company uniquement pour manager et agent */}
                  {user?.role !== 'admin' && (
                    <InfoRow icon="call-outline" label="Phone" value={user?.phoneNumber || '—'} />
                  )}
                  {user?.role !== 'admin' && (
                    <InfoRow icon="business-outline" label="Company" value={user?.companyName || '—'} />
                  )}
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <FieldInput label="First Name *" value={firstName} onChange={setFirstName}
                    placeholder="First name" icon="person-outline" />
                  <FieldInput label="Last Name" value={lastName} onChange={setLastName}
                    placeholder="Last name" icon="person-outline" />
                  {/* Phone uniquement pour non-admin */}
                  {user?.role !== 'admin' && (
                    <FieldInput label="Phone Number" value={phone} onChange={setPhone}
                      placeholder="+216 XX XXX XXX" icon="call-outline" keyboardType="phone-pad" />
                  )}
                  <FieldInput label="Email (cannot be changed)" value={user?.email || ''}
                    onChange={() => {}} placeholder="" icon="mail-outline" editable={false} />

                  <TouchableOpacity onPress={handleSaveProfile} disabled={savingProfile}
                    style={{ marginTop: 4 }}>
                    <LinearGradient colors={[T.navy, T.blue, T.orange]} style={P.primaryBtn}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {savingProfile
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><Ionicons name="checkmark-outline" size={16} color="#fff" />
                            <Text style={P.primaryBtnTxt}>Save Changes</Text></>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Account Status — masqué pour admin */}
            {user?.role !== 'admin' && (
              <View style={[P.card, { marginTop: 12 }]}>
                <View style={P.cardHeader}>
                  <View style={P.cardIconWrap}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={T.blue} />
                  </View>
                  <Text style={P.cardTitle}>Account Status</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <View style={[P.statusChip, {
                    backgroundColor: user?.isVerified ? T.greenBg : T.amberBg,
                  }]}>
                    <Ionicons
                      name={user?.isVerified ? 'checkmark-circle' : 'time-outline'}
                      size={13}
                      color={user?.isVerified ? T.green : T.amber}
                    />
                    <Text style={[P.statusChipTxt, {
                      color: user?.isVerified ? T.green : T.amber,
                    }]}>
                      {user?.isVerified ? 'Verified' : 'Pending Verification'}
                    </Text>
                  </View>
                  <View style={[P.statusChip, { backgroundColor: T.blueBg }]}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.blue }} />
                    <Text style={[P.statusChipTxt, { color: T.blue, textTransform: 'capitalize' }]}>
                      {user?.status || 'active'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Logout */}
            <TouchableOpacity style={P.logoutBtn} onPress={() =>
              Alert.alert('Log Out', 'Are you sure?', [
                { text: 'Cancel' },
                { text: 'Log Out', style: 'destructive', onPress: logout },
              ])
            }>
              <Ionicons name="log-out-outline" size={17} color={T.red} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.red }}>Log Out</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ═══════════════════ SECURITY TAB ═══════════════════ */}
        {tab === 'security' && (
          <>
            {/* Change Password */}
            <View style={P.card}>
              <View style={P.cardHeader}>
                <View style={P.cardIconWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={T.blue} />
                </View>
                <View>
                  <Text style={P.cardTitle}>Change Password</Text>
                  <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                    All sessions will be closed after change
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 8 }}>
                <FieldInput label="Current Password" value={oldPw} onChange={setOldPw}
                  placeholder="••••••••" icon="lock-closed-outline" secure showToggle />
                <FieldInput label="New Password" value={newPw} onChange={setNewPw}
                  placeholder="Min. 8 characters" icon="lock-open-outline" secure showToggle />
                <FieldInput label="Confirm New Password" value={confirmPw} onChange={setConfirmPw}
                  placeholder="Repeat new password" icon="lock-open-outline" secure showToggle />
                <TouchableOpacity onPress={handleChangePassword} disabled={savingPw} style={{ marginTop: 4 }}>
                  <LinearGradient colors={[T.navy, T.blue, T.orange]} style={P.primaryBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {savingPw
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Ionicons name="lock-closed-outline" size={16} color="#fff" />
                          <Text style={P.primaryBtnTxt}>Update Password</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Active Sessions */}
            <View style={[P.card, { marginTop: 12 }]}>
              <View style={P.cardHeader}>
                <View style={P.cardIconWrap}>
                  <Ionicons name="phone-portrait-outline" size={16} color={T.blue} />
                </View>
                <Text style={P.cardTitle}>Active Sessions</Text>
                <TouchableOpacity onPress={loadSessions} style={P.refreshBtn}>
                  <Ionicons name="refresh-outline" size={15} color={T.blue} />
                </TouchableOpacity>
              </View>

              {loadingSessions ? (
                <ActivityIndicator color={T.blue} style={{ marginVertical: 20 }} />
              ) : sessions.length === 0 ? (
                <View style={P.emptyState}>
                  <Ionicons name="phone-portrait-outline" size={30} color={T.textMuted} />
                  <Text style={P.emptyStateTxt}>No active sessions found</Text>
                </View>
              ) : (
                sessions.map((s, i) => (
                  <View key={s.id} style={[P.sessionRow,
                    i === sessions.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[P.sessionIcon, s.is_current && { backgroundColor: T.blueBg }]}>
                      <Ionicons name="phone-portrait-outline" size={16}
                        color={s.is_current ? T.blue : T.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: T.text }}>
                        {s.device_name || 'Unknown device'}
                      </Text>
                      <Text style={{ fontSize: 11, color: T.textMuted }}>{s.ip_address}</Text>
                      <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>
                        {new Date(s.last_activity).toLocaleString()}
                      </Text>
                    </View>
                    {!s.is_current ? (
                      <TouchableOpacity onPress={() => handleRevokeSession(s.id)} style={P.revokeBtn}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: T.red }}>Revoke</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={P.currentBadge}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: T.green }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: T.green }}>Current</Text>
                      </View>
                    )}
                  </View>
                ))
              )}

              {sessions.length > 0 && (
                <TouchableOpacity onPress={handleLogoutAll} style={P.logoutAllBtn}>
                  <Ionicons name="log-out-outline" size={14} color={T.red} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: T.red }}>
                    Log out all devices
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ═══════════════════ PERMISSIONS TAB ═══════════════════ */}
        {tab === 'permissions' && user?.role === 'agent' && (
          <View style={P.card}>
            <View style={P.cardHeader}>
              <View style={P.cardIconWrap}>
                <Ionicons name="key-outline" size={16} color={T.blue} />
              </View>
              <View>
                <Text style={P.cardTitle}>My Permissions</Text>
                <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                  {(user?.permissions || []).length} permissions granted
                </Text>
              </View>
            </View>

            {(user?.permissions || []).length === 0 ? (
              <View style={P.emptyState}>
                <Ionicons name="key-outline" size={34} color={T.textMuted} />
                <Text style={P.emptyStateTxt}>No permissions assigned yet</Text>
                <Text style={{ fontSize: 11, color: T.textMuted, textAlign: 'center', marginTop: 4 }}>
                  Contact your manager to request access
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(user?.permissions || []).map((p: string, i: number) => (
                  <View key={i} style={P.permChip}>
                    <Ionicons name="checkmark-circle" size={12} color={T.green} />
                    <Text style={P.permChipTxt}>{p.replace(/-/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const P = StyleSheet.create({
  // Header
  header: {
    backgroundColor: T.navy,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  headerCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(26,111,232,0.12)',
    top: -60, right: -60,
  },
  headerCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 1, borderColor: 'rgba(232,124,26,0.1)',
    bottom: -20, left: -20,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2, borderColor: T.orange,
    padding: 3,
    marginBottom: 14,
  },
  avatar: {
    flex: 1, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:   { fontSize: 28, fontWeight: '900', color: T.white, letterSpacing: 1 },
  headerName:  { fontSize: 22, fontWeight: '800', color: T.white, letterSpacing: -0.3, marginBottom: 5 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
  },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: T.white, letterSpacing: 0.5 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: T.card,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 13,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive:   { borderBottomColor: T.blue },
  tabLabel:       { fontSize: 12, fontWeight: '500', color: T.textMuted },
  tabLabelActive: { color: T.blue, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: T.card,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#0a1628',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  cardIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: T.blueBg, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: T.text },

  // Edit pill
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: T.blueBg,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  editPillCancel: { backgroundColor: T.surface, borderColor: T.border },
  editPillTxt:    { fontSize: 12, fontWeight: '600', color: T.blue },

  // Info row
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: T.borderLight,
  },
  infoIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: T.blueBg, alignItems: 'center', justifyContent: 'center',
  },
  infoLabel:    { fontSize: 12, color: T.textMuted, width: 62 },
  infoValue:    { flex: 1, fontSize: 13, fontWeight: '500', color: T.text, textAlign: 'right' },

  // Form
  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.textSub, marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: 0.5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: T.border,
    borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11,
    backgroundColor: T.surface,
  },
  input: { flex: 1, fontSize: 14, color: T.text },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  primaryBtnTxt: { fontSize: 14, fontWeight: '700', color: T.white },

  // Status chips
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
  },
  statusChipTxt: { fontSize: 12, fontWeight: '700' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: T.card, borderRadius: 14,
    paddingVertical: 15, marginTop: 12,
    borderWidth: 1.5, borderColor: '#fecaca',
    shadowColor: T.red, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

  // Sessions
  refreshBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: T.blueBg, alignItems: 'center', justifyContent: 'center',
  },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.borderLight,
  },
  sessionIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
  },
  revokeBtn: {
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8,
    backgroundColor: T.redBg, borderWidth: 1, borderColor: '#fecaca',
  },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
    backgroundColor: T.greenBg,
  },
  logoutAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: T.borderLight,
  },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 28, gap: 8,
  },
  emptyStateTxt: { fontSize: 13, color: T.textMuted, fontWeight: '500' },

  // Permissions
  permChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.surface, borderRadius: 99,
    paddingHorizontal: 11, paddingVertical: 6,
    borderWidth: 1, borderColor: T.border,
  },
  permChipTxt: { fontSize: 11, color: T.text, fontWeight: '500', textTransform: 'capitalize' },
});