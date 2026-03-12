import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Dimensions, RefreshControl, ActivityIndicator,
  Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import {
  AgingService,
  InventoryMobileService,
  TransactionMobileService,
  type AgingRow,
  type AgingDistributionItem,
  type InventoryBranch,
  type InventoryCategory,
  type InventoryLine,
  type Transaction,
} from '../../lib/mobileDataService';

const { width } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined): string => {
  const v = Number(n);
  if (n == null || isNaN(v)) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
};

const fmtCurrency = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? '—' : `${fmt(n)} DL`;

const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return s; }
};
const safeNum = (n: number | null | undefined, fallback = 0): number =>
  n == null || isNaN(Number(n)) ? fallback : Number(n);


const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#16a34a',
};

// ── Tab Bar ───────────────────────────────────────────────────────────────────

const TABS = ['Aging', 'Inventory', 'Transactions'] as const;
type TabName = typeof TABS[number];

function TabBar({ active, onChange }: { active: TabName; onChange: (t: TabName) => void }) {
  return (
    <View style={st.tabBar}>
      {TABS.map(tab => {
        const isActive = active === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[st.tabItem, isActive && st.tabItemActive]}
            onPress={() => onChange(tab)}
            activeOpacity={0.7}
          >
            <Text style={[st.tabLabel, isActive && st.tabLabelActive]}>{tab}</Text>
            {isActive && <View style={st.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────

function SearchBar({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={st.searchWrap}>
      <Ionicons name="search-outline" size={16} color={Colors.gray400} style={{ marginRight: 8 }} />
      <TextInput
        style={st.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? 'Search…'}
        placeholderTextColor={Colors.gray400}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && Platform.OS !== 'ios' && (
        <TouchableOpacity onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={16} color={Colors.gray400} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Skeleton Rows ─────────────────────────────────────────────────────────────

function SkeletonRow({ lines = 2 }: { lines?: number }) {
  return (
    <View style={[st.card, { gap: 8, marginBottom: 10 }]}>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[st.skeleton, { width: i === 0 ? '70%' : '45%', height: i === 0 ? 14 : 11 }]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AGING TAB
// ─────────────────────────────────────────────────────────────────────────────

function AgingDistributionBar({ items }: { items: AgingDistributionItem[] }) {
  if (!items.length) return null;
  const max = Math.max(...items.map(i => i.total), 1);

  return (
    <View style={[st.card, { marginBottom: 16 }]}>
      <Text style={st.cardTitle}>Aging Distribution</Text>
      {items.map((item, i) => {
        const pct = (item.total / max) * 100;
        const bucketColor = item.midpoint_days <= 0 ? '#16a34a' :
                            item.midpoint_days <= 60 ? '#f59e0b' :
                            item.midpoint_days <= 180 ? '#f97316' : '#dc2626';
        return (
          <View key={i} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: Colors.gray500 }}>{item.label}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontSize: 11, color: Colors.gray500 }}>
                  {safeNum(item.percentage).toFixed(1)}%
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.foreground }}>
                  {fmtCurrency(item.total)}
                </Text>
              </View>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: Colors.gray100, overflow: 'hidden' }}>
              <LinearGradient
                colors={[bucketColor + '60', bucketColor]}
                style={{ width: `${pct}%` as any, height: 6, borderRadius: 3 }}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AgingCard({ row, onPress }: { row: AgingRow; onPress?: () => void }) {
  const riskColor = RISK_COLORS[row.risk_score] ?? Colors.gray400;
  const overduePct = row.total > 0 ? (row.overdue_total / row.total) * 100 : 0;

  return (
    <TouchableOpacity
      style={[st.card, { marginBottom: 10 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.foreground }} numberOfLines={1}>
            {row.customer_name || row.account}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Text style={{ fontSize: 11, color: Colors.gray400 }}>{row.account_code}</Text>
            {row.branch && (
              <>
                <Text style={{ fontSize: 11, color: Colors.gray300 }}>·</Text>
                <Text style={{ fontSize: 11, color: Colors.gray400 }}>{row.branch}</Text>
              </>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.foreground }}>
            {fmtCurrency(row.total)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: riskColor }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: riskColor }}>
              {row.risk_score.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {row.overdue_total > 0 && (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 10, color: Colors.gray400 }}>
              Overdue: {fmtCurrency(row.overdue_total)}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: riskColor }}>
              {safeNum(overduePct).toFixed(0)}%
            </Text>
          </View>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: Colors.gray100, overflow: 'hidden' }}>
            <View style={{
              width: `${Math.min(100, overduePct)}%` as any,
              height: 4, borderRadius: 2, backgroundColor: riskColor,
            }} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function AgingTab() {
  const [search, setSearch]         = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [rows, setRows]             = useState<AgingRow[]>([]);
  const [dist, setDist]             = useState<AgingDistributionItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchList = useCallback(async (p = 1, isRefresh = false, newSearch = search, newRisk = riskFilter) => {
    if (p === 1) isRefresh ? setRefreshing(true) : setLoading(true);
    else setLoadingMore(true);
    try {
      const [listRes, distRes] = await Promise.allSettled([
        AgingService.getList({ page: p, page_size: 20, search: newSearch || undefined, risk: newRisk || undefined }),
        p === 1 ? AgingService.getDistribution() : Promise.resolve(null),
      ]);
      if (listRes.status === 'fulfilled') {
        const data = listRes.value;
        setRows(prev => p === 1 ? data.records : [...prev, ...data.records]);
        setTotalPages(data.total_pages);
        setGrandTotal(data.grand_total);
        setPage(p);
      }
      if (distRes.status === 'fulfilled' && distRes.value) {
        setDist(distRes.value.distribution ?? []);
      }
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, [search, riskFilter]);

  useEffect(() => { fetchList(1); }, []);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    fetchList(1, false, v, riskFilter);
  }, [riskFilter, fetchList]);

  const onRisk = (r: string) => {
    const next = riskFilter === r ? '' : r;
    setRiskFilter(next);
    fetchList(1, false, search, next);
  };

  const loadMore = () => {
    if (!loadingMore && page < totalPages) fetchList(page + 1);
  };

  const RISKS = ['critical', 'high', 'medium', 'low'];

  return (
    <View style={{ flex: 1 }}>
      {/* Summary strip */}
      <View style={st.summaryStrip}>
        <Ionicons name="wallet-outline" size={14} color={Colors.indigo600} />
        <Text style={st.summaryTxt}>Grand Total: </Text>
        <Text style={[st.summaryTxt, { fontWeight: '800', color: Colors.foreground }]}>
          {fmtCurrency(grandTotal)}
        </Text>
      </View>

      <SearchBar value={search} onChange={onSearch} placeholder="Search customer, code…" />

      {/* Risk filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: Spacing.base, marginBottom: 12 }}>
        {RISKS.map(r => {
          const active = riskFilter === r;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => onRisk(r)}
              style={[st.filterChip, active && { backgroundColor: RISK_COLORS[r] }]}
            >
              <View style={[{ width: 7, height: 7, borderRadius: 4, marginRight: 5 },
                { backgroundColor: active ? '#fff' : RISK_COLORS[r] }]} />
              <Text style={[st.filterChipTxt, active && { color: '#fff' }]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 20 }}
        ListHeaderComponent={loading ? null : <AgingDistributionBar items={dist} />}
        renderItem={({ item }) => <AgingCard row={item} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} lines={2} />)}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <Ionicons name="search-outline" size={36} color={Colors.gray300} />
              <Text style={{ color: Colors.gray400, marginTop: 12 }}>No results found</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.indigo600} style={{ margin: 16 }} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchList(1, true)} tintColor={Colors.indigo600} />
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY TAB
// ─────────────────────────────────────────────────────────────────────────────

function BranchCard({ b }: { b: InventoryBranch }) {
  return (
    <View style={[st.card, { marginBottom: 10 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[st.iconCircle, { backgroundColor: Colors.indigo600 + '20' }]}>
            <Ionicons name="storefront-outline" size={16} color={Colors.indigo600} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.foreground }}>{b.branch}</Text>
            <Text style={{ fontSize: 11, color: Colors.gray400, marginTop: 1 }}>
              {safeNum(b.total_qty).toLocaleString()} units
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.foreground }}>
          {fmtCurrency(b.total_value)}
        </Text>
      </View>
    </View>
  );
}

function CategoryBar({ categories }: { categories: InventoryCategory[] }) {
  if (!categories.length) return null;
  const total = categories.reduce((s, c) => s + c.total_value, 0) || 1;
  const TOP_COLORS = [Colors.indigo600, '#f59e0b', '#16a34a', '#f97316', '#8b5cf6', '#ec4899'];

  return (
    <View style={[st.card, { marginBottom: 16 }]}>
      <Text style={st.cardTitle}>By Category</Text>
      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
        {categories.slice(0, 6).map((c, i) => (
          <View key={i} style={{ flex: c.total_value / total, backgroundColor: TOP_COLORS[i % TOP_COLORS.length] }} />
        ))}
      </View>
      {categories.slice(0, 6).map((c, i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: TOP_COLORS[i % TOP_COLORS.length] }} />
            <Text style={{ fontSize: 12, color: Colors.gray600 }} numberOfLines={1}>{c.category}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.foreground, marginLeft: 8 }}>
            {fmtCurrency(c.total_value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InventoryLineRow({ line }: { line: InventoryLine }) {
  return (
    <View style={[st.lineRow, Shadow.sm]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.foreground }} numberOfLines={1}>
          {line.product_name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
          <Text style={{ fontSize: 11, color: Colors.gray400 }}>{line.product_code}</Text>
          {line.branch_name && (
            <Text style={{ fontSize: 11, color: Colors.indigo600, fontWeight: '600' }}>{line.branch_name}</Text>
          )}
        </View>
        {line.product_category && (
          <Text style={{ fontSize: 10, color: Colors.gray400, marginTop: 2 }}>{line.product_category}</Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.foreground }}>
          {fmtCurrency(line.line_value)}
        </Text>
        <Text style={{ fontSize: 11, color: Colors.gray500, marginTop: 1 }}>
          ×{safeNum(line.quantity).toLocaleString()}
        </Text>
        <Text style={{ fontSize: 10, color: Colors.gray400 }}>
          @ {fmtCurrency(line.unit_cost)}/u
        </Text>
      </View>
    </View>
  );
}

function InventoryTab() {
  const [branches, setBranches]     = useState<InventoryBranch[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [lines, setLines]           = useState<InventoryLine[]>([]);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [search, setSearch]         = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totals, setTotals]         = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSnapshot = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const snap = await InventoryMobileService.getLatestSnapshot();
      const latest = (snap as any)?.items?.[0] ?? (snap as any)?.[0] ?? null;
      if (latest) {
        setSnapshotId(latest.id);
        setSnapshotLabel(latest.label ?? latest.snapshot_date ?? '');
        await fetchLinesForSnapshot(latest.id, 1, '', '');
      }
      const [brRes, catRes] = await Promise.allSettled([
        InventoryMobileService.getBranchSummary(latest?.id),
        InventoryMobileService.getCategoryBreakdown(latest?.id),
      ]);
      if (brRes.status === 'fulfilled') setBranches(brRes.value.branches ?? []);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.categories ?? []);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  const fetchLinesForSnapshot = async (sid: string, p: number, s: string, br: string) => {
    if (p > 1) setLoadingMore(true);
    try {
      const res = await InventoryMobileService.getLines(sid, {
        page: p, page_size: 25,
        search: s || undefined,
        branch: br || undefined,
      });
      setLines(prev => p === 1 ? res.lines : [...prev, ...res.lines]);
      setTotalPages(res.total_pages);
      setTotals(res.totals);
      setPage(p);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchSnapshot(); }, []);

  const onSearch = (v: string) => {
    setSearch(v);
    if (snapshotId) fetchLinesForSnapshot(snapshotId, 1, v, branchFilter);
  };

  const onBranch = (b: string) => {
    const next = branchFilter === b ? '' : b;
    setBranchFilter(next);
    if (snapshotId) fetchLinesForSnapshot(snapshotId, 1, search, next);
  };

  const loadMore = () => {
    if (!loadingMore && page < totalPages && snapshotId) {
      fetchLinesForSnapshot(snapshotId, page + 1, search, branchFilter);
    }
  };

  return (
    <FlatList
      data={lines}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 20 }}
      ListHeaderComponent={
        <>
          {/* Snapshot label */}
          {snapshotLabel ? (
            <View style={st.summaryStrip}>
              <Ionicons name="archive-outline" size={14} color={Colors.indigo600} />
              <Text style={st.summaryTxt}>Snapshot: </Text>
              <Text style={[st.summaryTxt, { fontWeight: '700', color: Colors.foreground }]}>
                {snapshotLabel}
              </Text>
            </View>
          ) : null}

          {/* KPI row */}
          {totals && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {[
                { label: 'Total Value', value: fmtCurrency(totals.grand_total_value) },
                { label: 'Products', value: totals.distinct_products?.toLocaleString() ?? '—' },
                { label: 'Out of Stock', value: String(totals.out_of_stock_count ?? '—') },
                { label: 'Critical', value: String(totals.critical_count ?? '—') },
              ].map((m, i) => (
                <View key={i} style={[st.miniKpi, Shadow.sm]}>
                  <Text style={st.miniKpiValue}>{m.value}</Text>
                  <Text style={st.miniKpiLabel}>{m.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Branch summary */}
          {!loading && branches.length > 0 && (
            <View style={{ marginBottom: 4 }}>
              <Text style={[st.sectionTitle, { marginBottom: 10 }]}>By Branch</Text>
              {branches.map((b, i) => <BranchCard key={i} b={b} />)}
            </View>
          )}

          {/* Category breakdown */}
          {!loading && <CategoryBar categories={categories} />}

          {/* Search + branch filter */}
          <SearchBar value={search} onChange={onSearch} placeholder="Search product, code…" />
          {branches.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {branches.map((b, i) => {
                const active = branchFilter === b.branch;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onBranch(b.branch)}
                    style={[st.filterChip, active && { backgroundColor: Colors.indigo600 }]}
                  >
                    <Text style={[st.filterChipTxt, active && { color: '#fff' }]}>{b.branch}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {loading && (
            <View style={{ paddingTop: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} lines={3} />)}
            </View>
          )}
        </>
      }
      renderItem={({ item }) => <InventoryLineRow line={item} />}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.indigo600} style={{ margin: 16 }} /> : null}
      onEndReached={loadMore}
      onEndReachedThreshold={0.2}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchSnapshot(true)} tintColor={Colors.indigo600} />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: Transaction }) {
  const isIn  = (tx.qty_in ?? 0) > 0;
  const color = isIn ? '#16a34a' : '#dc2626';
  const qty   = isIn ? tx.qty_in : tx.qty_out;
  const val   = isIn ? tx.total_in : tx.total_out;

  return (
    <View style={[st.card, { marginBottom: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={[st.iconCircle, { backgroundColor: color + '18', marginRight: 12 }]}>
          <Ionicons
            name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={16}
            color={color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.foreground }} numberOfLines={1}>
            {tx.material_name || tx.material_code}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 11, color: Colors.gray400 }}>{tx.movement_type}</Text>
            {tx.branch_name_resolved && (
              <Text style={{ fontSize: 11, color: Colors.indigo600 }}>{tx.branch_name_resolved}</Text>
            )}
            {tx.customer_name && (
              <Text style={{ fontSize: 11, color: Colors.gray500 }} numberOfLines={1}>
                · {tx.customer_name}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 10, color: Colors.gray400, marginTop: 3 }}>
            {fmtDate(tx.movement_date)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color }}>
            {isIn ? '+' : '-'}{fmtCurrency(val)}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.gray500, marginTop: 1 }}>
            ×{safeNum(qty).toLocaleString()} u
          </Text>
        </View>
      </View>
    </View>
  );
}

function TransactionsTab() {
  const [txs, setTxs]               = useState<Transaction[]>([]);
  const [types, setTypes]           = useState<string[]>([]);
  const [branches, setBranches]     = useState<string[]>([]);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [totals, setTotals]         = useState<{ total_in_value: number; total_out_value: number } | null>(null);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeta = useCallback(async () => {
    const [typRes, brRes] = await Promise.allSettled([
      TransactionMobileService.getMovementTypes(),
      TransactionMobileService.getBranches(),
    ]);
    if (typRes.status === 'fulfilled') setTypes(typRes.value.movement_types ?? []);
    if (brRes.status === 'fulfilled') setBranches(brRes.value.branches ?? []);
  }, []);

  const fetchList = useCallback(async (p = 1, isRefresh = false, newSearch = search, newType = typeFilter, newBranch = branchFilter) => {
    if (p === 1) isRefresh ? setRefreshing(true) : setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await TransactionMobileService.getList({
        page: p, page_size: 25,
        search: newSearch || undefined,
        movement_type: newType || undefined,
        branch: newBranch || undefined,
      });
      setTxs(prev => p === 1 ? res.movements : [...prev, ...res.movements]);
      setTotalPages(res.total_pages);
      setTotals(res.totals);
      setPage(p);
    } finally {
      setLoading(false); setRefreshing(false); setLoadingMore(false);
    }
  }, [search, typeFilter, branchFilter]);

  useEffect(() => {
    fetchMeta();
    fetchList(1);
  }, []);

  const onSearch = (v: string) => {
    setSearch(v);
    fetchList(1, false, v, typeFilter, branchFilter);
  };
  const onType = (t: string) => {
    const next = typeFilter === t ? '' : t;
    setTypeFilter(next);
    fetchList(1, false, search, next, branchFilter);
  };
  const onBranch = (b: string) => {
    const next = branchFilter === b ? '' : b;
    setBranchFilter(next);
    fetchList(1, false, search, typeFilter, next);
  };
  const loadMore = () => {
    if (!loadingMore && page < totalPages) fetchList(page + 1);
  };

  return (
    <FlatList
      data={txs}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 20 }}
      ListHeaderComponent={
        <>
          {/* Totals strip */}
          {totals && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {[
                { label: 'Total In', value: fmtCurrency(totals.total_in_value), color: '#16a34a' },
                { label: 'Total Out', value: fmtCurrency(totals.total_out_value), color: '#dc2626' },
                { label: 'Net', value: fmtCurrency((totals.total_in_value ?? 0) - (totals.total_out_value ?? 0)), color: Colors.indigo600 },
              ].map((m, i) => (
                <View key={i} style={[st.miniKpi, Shadow.sm, { borderTopWidth: 3, borderTopColor: m.color }]}>
                  <Text style={[st.miniKpiValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={st.miniKpiLabel}>{m.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <SearchBar value={search} onChange={onSearch} placeholder="Search product, customer…" />

          {/* Movement type filters */}
          {types.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {types.map((t, i) => {
                const active = typeFilter === t;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onType(t)}
                    style={[st.filterChip, active && { backgroundColor: Colors.indigo600 }]}
                  >
                    <Text style={[st.filterChipTxt, active && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Branch filters */}
          {branches.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {branches.map((b, i) => {
                const active = branchFilter === b;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => onBranch(b)}
                    style={[st.filterChip, active && { backgroundColor: '#f59e0b' }]}
                  >
                    <Text style={[st.filterChipTxt, active && { color: '#fff' }]}>{b}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {loading && (
            <View style={{ paddingTop: 4 }}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} lines={3} />)}
            </View>
          )}
        </>
      }
      renderItem={({ item }) => <TransactionRow tx={item} />}
      ListEmptyComponent={
        !loading ? (
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <Ionicons name="swap-horizontal-outline" size={40} color={Colors.gray300} />
            <Text style={{ color: Colors.gray400, marginTop: 12 }}>No transactions found</Text>
          </View>
        ) : null
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.indigo600} style={{ margin: 16 }} /> : null}
      onEndReached={loadMore}
      onEndReachedThreshold={0.2}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchList(1, true)} tintColor={Colors.indigo600} />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL SCREEN (Root)
// ─────────────────────────────────────────────────────────────────────────────

export function ControlScreen({ route }: any) {
  const defaultTab = (route?.params?.tab === 'aging' ? 'Aging' :
                      route?.params?.tab === 'inventory' ? 'Inventory' :
                      route?.params?.tab === 'transactions' ? 'Transactions' : 'Aging') as TabName;

  const [activeTab, setActiveTab] = useState<TabName>(defaultTab);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.gray50 }}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.indigo600, Colors.violet600 ?? '#7c3aed']}
        style={st.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={st.headerTitle}>Control</Text>
        <Text style={st.headerSub}>Aging · Inventory · Transactions</Text>
      </LinearGradient>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Aging'        && <AgingTab />}
        {activeTab === 'Inventory'    && <InventoryTab />}
        {activeTab === 'Transactions' && <TransactionsTab />}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  header:         { padding: 20, paddingTop: 28, paddingBottom: 20 },
  headerTitle:    { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  tabBar:         { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  tabItem:        { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabItemActive:  {},
  tabLabel:       { fontSize: 13, fontWeight: '600', color: Colors.gray400 },
  tabLabelActive: { color: Colors.indigo600 },
  tabIndicator:   { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, borderRadius: 1, backgroundColor: Colors.indigo600 },
  card:           { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 14, borderWidth: 1, borderColor: Colors.gray100 },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: Colors.foreground, marginBottom: 14 },
  lineRow:        { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.gray100, flexDirection: 'row', alignItems: 'flex-start' },
  summaryStrip:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.indigo600 + '10', paddingHorizontal: Spacing.base, paddingVertical: 10, marginBottom: 14 },
  summaryTxt:     { fontSize: 12, color: Colors.gray600 },
  sectionTitle:   { fontSize: 15, fontWeight: '800', color: Colors.foreground },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, paddingHorizontal: 14, marginHorizontal: Spacing.base, marginBottom: 12, borderWidth: 1, borderColor: Colors.gray100, height: 42 },
  searchInput:    { flex: 1, fontSize: 14, color: Colors.foreground },
  filterChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200, marginRight: 8 },
  filterChipTxt:  { fontSize: 12, fontWeight: '600', color: Colors.gray600 },
  iconCircle:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  miniKpi:        { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 14, marginRight: 10, minWidth: 110, borderWidth: 1, borderColor: Colors.gray100 },
  miniKpiValue:   { fontSize: 16, fontWeight: '800', color: Colors.foreground, marginBottom: 2 },
  miniKpiLabel:   { fontSize: 10, color: Colors.gray400 },
  skeleton:       { backgroundColor: Colors.gray100, borderRadius: 4 },
});