/**
 * ManagerAgentsScreen.tsx — WEEG v3 Premium
 * Team overview screen.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ManagerService } from '../../lib/api';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  navy:       '#0a1628',
  navy2:      '#111f3a',
  navy3:      '#1a2d4f',
  blue:       '#1a5cf0',
  blueSoft:   'rgba(26,92,240,0.10)',
  green:      '#10b981',
  greenSoft:  'rgba(16,185,129,0.12)',
  red:        '#ef4444',
  redSoft:    'rgba(239,68,68,0.10)',
  purple:     '#8b5cf6',
  amber:      '#f59e0b',
  white:      '#ffffff',
  surface2:   '#f8fafc',
  border:     '#e2e8f0',
  border2:    '#f1f5f9',
  text:       '#0f172a',
  text2:      '#475569',
  text3:      '#94a3b8',
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  const hue = ((name.charCodeAt(0) || 0) * 37 + (name.charCodeAt(1) || 0) * 13) % 360;
  return (
    <LinearGradient
      colors={[`hsl(${hue},65%,42%)`, `hsl(${(hue + 45) % 360},75%,55%)`]}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), alignItems: 'center', justifyContent: 'center' }}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    >
      <Text style={{ fontSize: Math.round(size * 0.38), fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>{initials}</Text>
    </LinearGradient>
  );
}

// ─── Agent Card ───────────────────────────────────────────────────────────────
function AgentCard({ agent }: { agent: any }) {
  const name      = agent.full_name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || '—';
  const isActive  = agent.status === 'active' || agent.status === 'approved';

  return (
    <View style={AC.card}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <Avatar name={name} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: T.text, letterSpacing: -0.2 }}>{name}</Text>
          <Text style={{ fontSize: 11, color: T.text3, marginTop: 2 }} numberOfLines={1}>{agent.email}</Text>
          {agent.branch_name && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={10} color={T.text3} />
              <Text style={{ fontSize: 10.5, color: T.text3 }}>{agent.branch_name}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: isActive ? T.greenSoft : T.redSoft }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isActive ? T.green : T.red }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? T.green : T.red, textTransform: 'uppercase', letterSpacing: 0.3 }}>
            {isActive ? 'Active' : agent.status || 'active'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
        {agent.created_at ? (
          <Text style={{ fontSize: 10, color: T.text3 }}>
            Joined {new Date(agent.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
          </Text>
        ) : <View />}
      </View>
    </View>
  );
}

const AC = StyleSheet.create({
  card:      { backgroundColor: T.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: T.border, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function ManagerAgentsScreen() {
  const [agents, setAgents]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');

  const loadAgents = useCallback(async () => {
    setLoading(true);
    const res = await ManagerService.getAgents();
    setAgents(res.ok ? (res.data?.agents || []) : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAgents(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadAgents(); setRefreshing(false); };

  const filteredAgents = agents.filter(a => {
    if (!search) return true;
    const q    = search.toLowerCase();
    const name = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
    return name.includes(q) || (a.email || '').toLowerCase().includes(q) || (a.branch_name || '').toLowerCase().includes(q);
  });

  const activeCount    = agents.filter(a => a.status === 'active' || a.status === 'approved').length;

  return (
    <View style={{ flex: 1, backgroundColor: T.surface2 }}>
      {/* Header */}
      <LinearGradient colors={[T.navy, T.navy2, '#1a3560']} style={TS.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ position: 'absolute', right: 50, bottom: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(26,92,240,0.15)' }} />

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>MANAGER</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>My Team</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>Team overview and activity</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -1 }}>{agents.length}</Text>
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>agents</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {[
            { label: 'Total',  val: agents.length, color: '#fff', bg: 'rgba(255,255,255,0.12)' },
            { label: 'Active', val: activeCount,   color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
          ].map(({ label, val, color, bg }) => (
            <View key={label} style={{ flex: 1, backgroundColor: bg, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color }}>{val}</Text>
              <Text style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 }}>{label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={{ backgroundColor: T.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: T.border }}>
          <Ionicons name="search-outline" size={16} color={T.text3} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Search by name, email or branch…"
            placeholderTextColor={T.text3}
            style={{ flex: 1, fontSize: 14, color: T.text }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={T.text3} />
            </TouchableOpacity>
          )}
        </View>
        {search.length > 0 && (
          <Text style={{ fontSize: 11.5, color: T.text3, marginTop: 6 }}>
            {filteredAgents.length} result{filteredAgents.length !== 1 ? 's' : ''} for "{search}"
          </Text>
        )}
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />}
        contentContainerStyle={{ padding: 16, paddingTop: 14, paddingBottom: 36 }}
      >
        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator color={T.blue} size="large" />
            <Text style={{ marginTop: 12, fontSize: 13, color: T.text3 }}>Loading agents…</Text>
          </View>
        ) : filteredAgents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: T.border2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="people-outline" size={36} color={T.text3} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>{search ? 'No agents found' : 'No agents yet'}</Text>
            <Text style={{ fontSize: 12.5, color: T.text3, marginTop: 4, textAlign: 'center' }}>
              {search ? 'Try a different search' : 'Agents assigned to you will appear here'}
            </Text>
          </View>
        ) : (
          filteredAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const TS = StyleSheet.create({
  header: { padding: 20, paddingTop: 18, paddingBottom: 18, position: 'relative', overflow: 'hidden' },
});