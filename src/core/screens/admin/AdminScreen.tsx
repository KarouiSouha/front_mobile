/**
 * AdminScreen.tsx — Panel Admin WEEG — v3
 *
 * Droits admin :
 *   • Approuver / Rejeter les demandes manager  (onglet Pending)
 *   • Voir la liste des agents                  (onglet Agents) — lecture seule
 *   • Suspendre / Réactiver les managers        (Managers / Suspended / All)
 *
 * Les permissions agents sont gérées par les managers, pas par l'admin.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { AdminService } from '../../lib/api';

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  indigo:      '#4338ca',
  indigoLight: '#e0e7ff',
  indigoDark:  '#312e81',
  violet:      '#7c3aed',
  sky:         '#0284c7',
  green:       '#059669',
  greenLight:  '#d1fae5',
  amber:       '#d97706',
  amberLight:  '#fef3c7',
  red:         '#dc2626',
  redLight:    '#fee2e2',
  slate50:     '#f8fafc',
  slate100:    '#f1f5f9',
  slate200:    '#e2e8f0',
  slate300:    '#cbd5e1',
  slate400:    '#94a3b8',
  slate500:    '#64748b',
  slate600:    '#475569',
  slate700:    '#334155',
  slate900:    '#0f172a',
  white:       '#ffffff',
};

type AdminTab = 'pending' | 'managers' | 'agents' | 'suspended' | 'all';

// ─── Composants visuels ───────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string; label: string }> = {
    approved:  { bg: P.greenLight, color: P.green, dot: P.green, label: 'Approved'  },
    active:    { bg: P.greenLight, color: P.green, dot: P.green, label: 'Active'    },
    pending:   { bg: P.amberLight, color: P.amber, dot: P.amber, label: 'Pending'   },
    rejected:  { bg: P.redLight,   color: P.red,   dot: P.red,   label: 'Rejected'  },
    suspended: { bg: P.redLight,   color: P.red,   dot: P.red,   label: 'Suspended' },
  };
  const c = map[status] || { bg: P.slate100, color: P.slate500, dot: P.slate400, label: status };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dot }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.color, letterSpacing: 0.3 }}>
        {c.label}
      </Text>
    </View>
  );
}

function RolePill({ role }: { role: string }) {
  const color = role === 'manager' ? P.sky : P.violet;
  const icon  = role === 'manager' ? 'briefcase-outline' : 'person-outline';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: color + '18', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 }}>
      <Ionicons name={icon as any} size={10} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'capitalize' }}>
        {role}
      </Text>
    </View>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  return (
    <LinearGradient colors={[color, color + 'cc']} style={S.avatar}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Text style={S.avatarTxt}>{initials}</Text>
    </LinearGradient>
  );
}

function Tag({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={S.tag}>
      <Ionicons name={icon as any} size={10} color={P.slate500} />
      <Text style={S.tagTxt} numberOfLines={1}>{label}</Text>
    </View>
  );
}

type ActionVariant = 'approve' | 'reject' | 'suspend' | 'reactivate';

function ActionBtn({ label, icon, variant, onPress }:
  { label: string; icon: string; variant: ActionVariant; onPress: () => void }) {
  const cfg: Record<ActionVariant, { bg: string; border: string; text: string }> = {
    approve:    { bg: P.green,      border: P.green,    text: P.white  },
    reject:     { bg: P.redLight,   border: '#fecaca',  text: P.red    },
    suspend:    { bg: '#fff1f2',    border: '#fecaca',  text: P.red    },
    reactivate: { bg: P.greenLight, border: '#6ee7b7',  text: P.green  },
  };
  const st = cfg[variant];
  return (
    <TouchableOpacity onPress={onPress}
      style={[S.actionBtn, { backgroundColor: st.bg, borderColor: st.border }]}>
      <Ionicons name={icon as any} size={12} color={st.text} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: st.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Modal rejet ──────────────────────────────────────────────────────────────

function RejectModal({ manager, onClose, onReject }:
  { manager: any; onClose: () => void; onReject: (r: string) => void }) {
  const [reason, setReason] = useState('');
  const quickReasons = [
    'Incomplete information',
    'Unverified company',
    'Duplicate account',
    'Invalid email domain',
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.white, padding: 24, paddingTop: 32 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: P.redLight,
            alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close-circle-outline" size={24} color={P.red} />
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: P.slate900 }}>Reject Request</Text>
            <Text style={{ fontSize: 12, color: P.slate400 }}>
              {manager?.first_name} {manager?.last_name}
            </Text>
          </View>
        </View>

        {/* Quick reasons */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: P.slate600, marginBottom: 10 }}>
          Quick reasons
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {quickReasons.map(r => (
            <TouchableOpacity key={r} onPress={() => setReason(r)}
              style={[S.quickReason, reason === r && S.quickReasonActive]}>
              <Text style={{ fontSize: 12, fontWeight: '600',
                color: reason === r ? P.indigo : P.slate500 }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: P.slate600, marginBottom: 8 }}>
          Or write a custom reason
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          placeholder="Describe why this request is being rejected..."
          placeholderTextColor={P.slate400}
          style={S.rejectInput}
        />

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <TouchableOpacity style={[S.cancelBtn, { flex: 1 }]} onPress={onClose}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: P.slate600 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!reason.trim()}
            onPress={() => { onReject(reason); onClose(); }}
            style={{ flex: 2, opacity: reason.trim() ? 1 : 0.4, borderRadius: 12, overflow: 'hidden' }}
          >
            <View style={{ backgroundColor: P.red, paddingVertical: 14,
              alignItems: 'center', borderRadius: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Reject Request</Text>
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

// ─── Screen principal ─────────────────────────────────────────────────────────

export function AdminScreen() {
  const { approveManager, rejectManager } = useAuth();
  const [tab, setTab]       = useState<AdminTab>('pending');
  const [users, setUsers]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectingManager, setRejectingManager] = useState<any>(null);

  const filterMap: Record<AdminTab, { status?: string; role?: string }> = {
    pending:   { status: 'pending' },
    managers:  { role: 'manager' },   // all managers — on filtre côté client
    agents:    { role: 'agent' },
    suspended: { status: 'suspended' },
    all:       {},
  };

  const loadUsers = useCallback(async (currentTab: AdminTab) => {
    setLoading(true);
    if (currentTab === 'pending') {
      const res = await AdminService.getPendingManagers();
      setUsers(res.ok ? (res.data || []) : []);
    } else {
      const res = await AdminService.getAllUsers(filterMap[currentTab]);
      let allUsers: any[] = res.ok ? (res.data?.users || []) : [];

      // Onglet Managers : exclure pending et suspended (afficher approved + active)
      if (currentTab === 'managers') {
        allUsers = allUsers.filter(
          u => u.status !== 'pending' && u.status !== 'suspended' && u.status !== 'rejected'
        );
      }

      setUsers(allUsers);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(tab); }, [tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers(tab);
    setRefreshing(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleApprove = (manager: any) => {
    Alert.alert('Approve Manager', `Approve ${manager.first_name} ${manager.last_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          const r = await approveManager(manager.id);
          if (r.success) {
            Alert.alert('✓ Approved', r.message);
            setUsers(prev => prev.filter(m => m.id !== manager.id));
          } else {
            Alert.alert('Error', r.message);
          }
        },
      },
    ]);
  };

  const handleReject = async (managerId: string, reason: string) => {
    const r = await rejectManager(managerId, reason);
    if (r.success) {
      Alert.alert('Rejected', r.message);
      setUsers(prev => prev.filter(m => m.id !== managerId));
    } else {
      Alert.alert('Error', r.message);
    }
  };

  const handleSuspend = (u: any) => {
    Alert.alert(
      'Suspend Manager',
      `Suspend ${u.first_name} ${u.last_name}?\nThey will lose access to the platform.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend', style: 'destructive',
          onPress: async () => {
            const res = await AdminService.updateUserStatus(u.id, 'suspended');
            if (res.ok) {
              // Remove immediately from managers list, they move to suspended
              setUsers(prev => prev.filter(m => m.id !== u.id));
              Alert.alert('✓ Suspended', res.data?.message || `${u.first_name} has been suspended.`);
            } else Alert.alert('Error', res.error || 'Failed');
          },
        },
      ],
    );
  };

  const handleReactivate = (u: any) => {
    Alert.alert(
      'Reactivate Manager',
      `Reactivate ${u.first_name} ${u.last_name}?\nThey will regain access to the platform.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            const res = await AdminService.updateUserStatus(u.id, 'active');
            if (res.ok) {
              // Remove immediately from suspended list, they move back to managers
              setUsers(prev => prev.filter(m => m.id !== u.id));
              Alert.alert('✓ Reactivated', res.data?.message || `${u.first_name} has been reactivated.`);
            } else Alert.alert('Error', res.error || 'Failed');
          },
        },
      ],
    );
  };

  // ── Rendu d'une carte ─────────────────────────────────────────────────────

  const renderUser = (u: any) => {
    const name = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—';
    const avatarColor = u.role === 'manager' ? P.sky : u.role === 'agent' ? P.violet : P.slate400;
    const isManager = u.role === 'manager';

    // Quelles actions l'admin peut faire ?
    const isPending   = tab === 'pending';
    const isSuspended = tab === 'suspended' || (tab === 'all' && u.status === 'suspended');
    const canSuspend  = isManager
      && u.status !== 'suspended'
      && u.status !== 'pending'
      && (tab === 'managers' || tab === 'all');

    const hasActions = isPending || isSuspended || canSuspend;

    // Infos société — le serializer retourne un objet "company" imbriqué
    // (ForeignKey Company sur le modèle Django)
    // On supporte aussi les champs à plat pour la rétro-compatibilité
    const co          = u.company || {};
    const companyName = co.name       || u.company_name || null;
    const industry    = co.industry   || u.industry     || null;
    const country     = co.country    || u.country      || null;
    const city        = co.city       || u.city         || null;
    const currentErp  = co.current_erp || u.current_erp || null;
    const phone       = u.phone_number || u.phone       || null;

    // Section société toujours visible pour les managers
    const showCompany = isManager || isPending;

    return (
      <View key={u.id} style={S.card}>

        {/* ── Ligne principale ──────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <Avatar name={name} color={avatarColor} />

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={S.userName} numberOfLines={1}>{name}</Text>
            <Text style={S.userEmail} numberOfLines={1}>{u.email}</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <RolePill role={u.role || 'user'} />
              <StatusPill status={u.status || 'active'} />
            </View>
          </View>

          {/* Date */}
          {u.created_at && (
            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
              <Text style={{ fontSize: 10, color: P.slate400 }}>Joined</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: P.slate500 }}>
                {new Date(u.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* ── Infos société — toujours affichées pour les managers ──────── */}
        {showCompany && (
          <View style={S.companySection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <Ionicons name="business-outline" size={12} color={P.indigo} />
              <Text style={S.companySectionTitle}>Company Information</Text>
            </View>

            {/* Grille 2 colonnes pour les champs société */}
            <View style={S.companyGrid}>

              {/* Nom société */}
              <View style={S.companyField}>
                <Text style={S.companyFieldLabel}>Company</Text>
                <Text style={S.companyFieldValue} numberOfLines={1}>
                  {companyName || <Text style={S.companyFieldEmpty}>—</Text>}
                </Text>
              </View>

              {/* Secteur d'activité */}
              <View style={S.companyField}>
                <Text style={S.companyFieldLabel}>Industry</Text>
                <Text style={S.companyFieldValue} numberOfLines={1}>
                  {industry || <Text style={S.companyFieldEmpty}>—</Text>}
                </Text>
              </View>

              {/* Pays */}
              <View style={S.companyField}>
                <Text style={S.companyFieldLabel}>Country</Text>
                <Text style={S.companyFieldValue} numberOfLines={1}>
                  {country || <Text style={S.companyFieldEmpty}>—</Text>}
                </Text>
              </View>

              {/* Ville */}
              <View style={S.companyField}>
                <Text style={S.companyFieldLabel}>City</Text>
                <Text style={S.companyFieldValue} numberOfLines={1}>
                  {city || <Text style={S.companyFieldEmpty}>—</Text>}
                </Text>
              </View>

              {/* ERP */}
              <View style={S.companyField}>
                <Text style={S.companyFieldLabel}>Current ERP</Text>
                <Text style={S.companyFieldValue} numberOfLines={1}>
                  {currentErp || <Text style={S.companyFieldEmpty}>Not specified</Text>}
                </Text>
              </View>

              {/* Téléphone */}
              {phone && (
                <View style={S.companyField}>
                  <Text style={S.companyFieldLabel}>Phone</Text>
                  <Text style={S.companyFieldValue} numberOfLines={1}>{phone}</Text>
                </View>
              )}

            </View>
          </View>
        )}

        {/* ── Actions manager ───────────────────────────────────────────── */}
        {hasActions && (
          <View style={S.actionsRow}>
            {isPending && (
              <>
                <ActionBtn label="Approve" icon="checkmark-circle-outline" variant="approve"
                  onPress={() => handleApprove(u)} />
                <ActionBtn label="Reject" icon="close-circle-outline" variant="reject"
                  onPress={() => setRejectingManager(u)} />
              </>
            )}
            {canSuspend && (
              <ActionBtn label="Suspend Manager" icon="ban-outline" variant="suspend"
                onPress={() => handleSuspend(u)} />
            )}
            {isSuspended && isManager && (
              <ActionBtn label="Reactivate" icon="refresh-circle-outline" variant="reactivate"
                onPress={() => handleReactivate(u)} />
            )}
          </View>
        )}

        {/* ── Agents : mention lecture seule ───────────────────────────── */}
        {!hasActions && u.role === 'agent' && (
          <View style={S.readOnlyBanner}>
            <Ionicons name="information-circle-outline" size={13} color={P.slate400} />
            <Text style={S.readOnlyTxt}>
              Permissions managed by their manager · read only
            </Text>
          </View>
        )}

      </View>
    );
  };

  // ── Tab config ────────────────────────────────────────────────────────────

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'pending',   label: 'Pending',   icon: 'time-outline'      },
    { id: 'managers',  label: 'Managers',  icon: 'briefcase-outline' },
    { id: 'agents',    label: 'Agents',    icon: 'people-outline'    },
    { id: 'suspended', label: 'Suspended', icon: 'ban-outline'       },
    { id: 'all',       label: 'All',       icon: 'grid-outline'      },
  ];

  const pendingCount = tab === 'pending' ? users.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: P.slate50 }}>

      {/* Modal rejet */}
      {rejectingManager && (
        <RejectModal
          manager={rejectingManager}
          onClose={() => setRejectingManager(null)}
          onReject={reason => handleReject(rejectingManager.id, reason)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient colors={[P.indigoDark, P.indigo]} style={S.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View>
          <Text style={S.headerLabel}>WEEG PLATFORM</Text>
          <Text style={S.headerTitle}>User Management</Text>
          <Text style={S.headerSub}>Review requests · manage manager accounts</Text>
        </View>
        <Ionicons name="shield-checkmark" size={32} color="rgba(255,255,255,0.18)" />
      </LinearGradient>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <View style={S.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.tabBarContent}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <TouchableOpacity key={t.id}
                style={[S.tabBtn, active && S.tabBtnActive]}
                onPress={() => setTab(t.id)}>
                <Ionicons name={t.icon as any} size={14}
                  color={active ? P.indigo : P.slate400} />
                <Text style={[S.tabLabel, active && S.tabLabelActive]}>{t.label}</Text>
                {t.id === 'pending' && pendingCount > 0 && (
                  <View style={S.tabBadge}>
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800' }}>
                      {pendingCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Liste ──────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.indigo} />
        }
      >
        <View style={{ padding: 16, paddingBottom: 40 }}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <ActivityIndicator color={P.indigo} size="large" />
              <Text style={{ marginTop: 12, fontSize: 13, color: P.slate400 }}>
                Loading users…
              </Text>
            </View>
          ) : users.length === 0 ? (
            <View style={S.emptyBox}>
              <View style={S.emptyIconWrap}>
                <Ionicons name="people-outline" size={36} color={P.slate400} />
              </View>
              <Text style={S.emptyTitle}>No users found</Text>
              <Text style={S.emptySub}>
                {tab === 'pending'
                  ? 'No pending requests at the moment'
                  : `No ${tab} accounts to display`}
              </Text>
            </View>
          ) : (
            users.map(u => renderUser(u))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  header: {
    padding: 20, paddingTop: 52, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: 10, fontWeight: '800',
    color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: P.white, letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  tabBarWrap: {
    height: 52, backgroundColor: P.white,
    borderBottomWidth: 1, borderBottomColor: P.slate200, zIndex: 10,
  },
  tabBarContent:  { paddingHorizontal: 12, alignItems: 'center' },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 52,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive:   { borderBottomColor: P.indigo },
  tabLabel:       { fontSize: 13, fontWeight: '500', color: P.slate400 },
  tabLabelActive: { color: P.indigo, fontWeight: '700' },
  tabBadge: {
    backgroundColor: P.red, borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    backgroundColor: P.white, borderRadius: 16, marginBottom: 12,
    padding: 16, borderWidth: 1, borderColor: P.slate200,
    shadowColor: P.slate900, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  avatar:    { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: 16, fontWeight: '900', color: P.white, letterSpacing: 0.5 },

  userName:  { fontSize: 15, fontWeight: '800', color: P.slate900, letterSpacing: -0.2 },
  userEmail: { fontSize: 12, color: P.slate400, marginTop: 2 },

  companySection: {
    marginTop: 14, backgroundColor: P.slate50,
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: P.slate200,
  },
  companySectionTitle: {
    fontSize: 11, fontWeight: '700', color: P.indigo,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  companyGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 0, marginTop: 4,
  },
  companyField: {
    width: '50%', paddingVertical: 6, paddingRight: 8,
  },
  companyFieldLabel: {
    fontSize: 10, fontWeight: '700', color: P.slate400,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  companyFieldValue: {
    fontSize: 13, fontWeight: '600', color: P.slate700,
  },
  companyFieldEmpty: {
    fontSize: 13, fontWeight: '400', color: P.slate300,
    fontStyle: 'italic',
  },

  tag:    {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: P.white, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: P.slate200,
  },
  tagTxt: { fontSize: 11, color: P.slate600, fontWeight: '500', maxWidth: 140 },

  actionsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: P.slate100,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 9, borderWidth: 1,
  },

  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: P.slate100,
  },
  readOnlyTxt: { fontSize: 11, color: P.slate400, fontStyle: 'italic' },

  emptyBox:      { backgroundColor: P.white, borderRadius: 20, padding: 48,
                   alignItems: 'center', borderWidth: 1, borderColor: P.slate200, marginTop: 8 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: P.slate100,
                   alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 16, fontWeight: '800', color: P.slate700, marginBottom: 6 },
  emptySub:      { fontSize: 13, color: P.slate400, textAlign: 'center', lineHeight: 20 },

  quickReason:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9,
                       borderWidth: 1.5, borderColor: P.slate200, backgroundColor: P.slate50 },
  quickReasonActive: { borderColor: P.indigo, backgroundColor: P.indigoLight },
  rejectInput:       { borderWidth: 1.5, borderColor: P.slate200, borderRadius: 12,
                       padding: 14, fontSize: 14, color: P.slate700,
                       backgroundColor: P.slate50, minHeight: 110, textAlignVertical: 'top' },

  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: P.slate100, alignItems: 'center', justifyContent: 'center',
  },
});