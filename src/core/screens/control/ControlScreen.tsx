/**
 * ControlScreen.tsx — WEEG Mobile v2
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE TABS: Aging · Inventory · Transactions
 *
 * ALL filtering is done server-side — mirrors web app exactly.
 * No client-side filtering except the branch cross-reference in Aging
 * (which mirrors AgingPage.tsx exactly).
 *
 * Aging params:    search, risk → GET /api/aging/
 *                 branch → cross-ref via GET /api/transactions/?movement_type=ف بيع&branch=X
 * Inventory params: branch, search → GET /api/inventory/<id>/lines/?branch=X&search=X
 * Transaction params: movement_type(trimmed), branch, date_from, date_to → GET /api/transactions/
 *
 * FIX: All FlatList data is deduped by id on append to prevent
 *      "Encountered two children with the same key" warning.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadow, getRiskColor } from '../../constants/theme';
import {
  SearchBar, SectionHeader, SummaryStrip, MiniKpi,
  BranchTag, EmptyState,
} from '../../components/SharedComponents';
import { FilterSheet, ActiveFilterChips } from '../../components/FilterSheet';
import {
  AgingService,
  InventoryMobileService,
  TransactionMobileService,
  periodToDates,
  MOVEMENT_TYPES,
  type AgingRow,
  type AgingDistributionItem,
  type BranchSummary,
  type CategoryBreakdown,
  type InventoryLine,
  type Movement,
} from '../../lib/mobileDataService';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n?: number | string | null): string => {
  const v = Number(n);
  if (n == null || isNaN(v)) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return Math.round(v).toLocaleString();
};
const fmtCurrency = (n?: number | string | null) => `${fmt(n)} DL`;
const fmtDate = (s: string) => {
  try { return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }); }
  catch { return s; }
};
const safe = (n?: number | string | null, fb = 0): number => {
  const v = Number(n); return isNaN(v) ? fb : v;
};

function Skeleton({ lines = 2 }: { lines?: number }) {
  return (
    <View style={[S.card, { gap:8, marginBottom:10 }]}>
      {Array.from({ length:lines }).map((_, i) => (
        <View key={i} style={[S.skeleton, { width: i===0 ? '70%' : '45%', height: i===0 ? 14 : 11 }]} />
      ))}
    </View>
  );
}

// ─── Dedup helper ─────────────────────────────────────────────────────────────
// Prevents "Encountered two children with the same key" when paginating.
// Returns prev unchanged for page 1, deduped merge for subsequent pages.
function mergeUnique<T extends { id: string }>(prev: T[], next: T[], page: number): T[] {
  if (page === 1) return next;
  const existingIds = new Set(prev.map(r => r.id));
  return [...prev, ...next.filter(r => !existingIds.has(r.id))];
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGING TAB
// ─────────────────────────────────────────────────────────────────────────────
// Mirrors AgingPage.tsx:
//   search + risk → GET /api/aging/?search=X&risk=X  (server-side)
//   branch → cross-ref: GET /api/transactions/?movement_type=ف بيع&branch=X&page_size=500
//            then client-side filter aging rows by customer_name ∈ returned names
// ═══════════════════════════════════════════════════════════════════════════════

function AgingDistBar({ items }: { items: AgingDistributionItem[] }) {
  if (!items.length) return null;
  const max = Math.max(...items.map(i => i.total), 1);
  const bucketColor = (d: number) => d <= 0 ? '#10b981' : d <= 60 ? '#f59e0b' : d <= 180 ? '#f97316' : '#e83535';
  return (
    <View style={[S.card, { marginBottom:12 }]}>
      <Text style={S.cardTitle}>Aging Distribution</Text>
      {items.map((item, i) => {
        const pct   = (item.total / max) * 100;
        const color = bucketColor(item.midpoint_days);
        return (
          <View key={i} style={{ marginBottom:9 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
              <Text style={{ fontSize:11, color:Colors.text3 }}>{item.label}</Text>
              <View style={{ flexDirection:'row', gap:10 }}>
                <Text style={{ fontSize:11, color:Colors.text3 }}>{safe(item.percentage).toFixed(1)}%</Text>
                <Text style={{ fontSize:11, fontWeight:'700', color:Colors.text }}>{fmtCurrency(item.total)}</Text>
              </View>
            </View>
            <View style={{ height:7, borderRadius:4, backgroundColor:Colors.bg, overflow:'hidden' }}>
              <LinearGradient colors={[color+'60', color]} style={{ width:`${pct}%` as any, height:7, borderRadius:4 }} start={{ x:0,y:0 }} end={{ x:1,y:0 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AgingCard({ row }: { row: AgingRow }) {
  const riskColor  = getRiskColor(row.risk_score);
  const overduePct = row.total > 0 ? (row.overdue_total / row.total) * 100 : 0;
  return (
    <View style={[S.card, { marginBottom:10 }]}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
        <View style={{ flex:1, marginRight:8 }}>
          <Text style={{ fontSize:13.5, fontWeight:'700', color:Colors.text }} numberOfLines={1}>
            {row.customer_name || row.account}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:4 }}>
            <Text style={{ fontSize:11, color:Colors.text3 }}>{row.account_code}</Text>
            {row.branch && <BranchTag label={row.branch} />}
          </View>
        </View>
        <View style={{ alignItems:'flex-end' }}>
          <Text style={{ fontSize:15, fontWeight:'700', color:Colors.text }}>{fmtCurrency(row.total)}</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:3 }}>
            <View style={{ width:6, height:6, borderRadius:3, backgroundColor:riskColor }} />
            <Text style={{ fontSize:10, fontWeight:'700', color:riskColor }}>{row.risk_score.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      {row.overdue_total > 0 && (
        <View style={{ marginTop:10 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
            <Text style={{ fontSize:10, color:Colors.text3 }}>Overdue: {fmtCurrency(row.overdue_total)}</Text>
            <Text style={{ fontSize:10, fontWeight:'700', color:riskColor }}>{safe(overduePct).toFixed(0)}%</Text>
          </View>
          <View style={{ height:4, borderRadius:2, backgroundColor:Colors.bg, overflow:'hidden' }}>
            <View style={{ width:`${Math.min(100, overduePct)}%` as any, height:4, borderRadius:2, backgroundColor:riskColor }} />
          </View>
        </View>
      )}
    </View>
  );
}

function AgingTab() {
  const [search,            setSearch]            = useState('');
  const [filters,           setFilters]           = useState({ risk:'all', branch:'all' });
  const [filterOpen,        setFilterOpen]        = useState(false);
  const [rows,              setRows]              = useState<AgingRow[]>([]);
  const [dist,              setDist]              = useState<AgingDistributionItem[]>([]);
  const [grandTotal,        setGrandTotal]        = useState(0);
  const [reportDate,        setReportDate]        = useState('');
  const [page,              setPage]              = useState(1);
  const [totalPages,        setTotalPages]        = useState(1);
  const [loading,           setLoading]           = useState(true);
  const [loadingMore,       setLoadingMore]       = useState(false);
  const [refreshing,        setRefreshing]        = useState(false);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  // Branch cross-reference (mirrors AgingPage.tsx)
  const [branchCustomers,   setBranchCustomers]   = useState<Set<string>|null>(null);
  const [branchLoading,     setBranchLoading]     = useState(false);

  // GET /api/transactions/branches/ — populate branch filter options
  useEffect(() => {
    TransactionMobileService.getBranches()
      .then(r => setAvailableBranches(r.branches ?? []))
      .catch(() => {});
  }, []);

  // Fetch aging rows — search + risk sent to backend
  const fetchList = useCallback(async (p = 1, isRefresh = false, s = search, f = filters) => {
    if (p === 1) isRefresh ? setRefreshing(true) : setLoading(true);
    else setLoadingMore(true);
    try {
      const params: Record<string,any> = { page: p, page_size: 20 };
      if (s)                params.search = s;
      if (f.risk !== 'all') params.risk   = f.risk;
      const [listRes, distRes] = await Promise.allSettled([
        AgingService.getList(params),
        p === 1 ? AgingService.getDistribution() : Promise.resolve(null),
      ]);
      if (listRes.status === 'fulfilled') {
        const data = listRes.value;
        // FIX: dedup by id to prevent duplicate key warning on scroll/filter
        setRows(prev => mergeUnique(prev, data.records, p));
        setTotalPages(data.total_pages);
        setGrandTotal(data.grand_total);
        setReportDate(data.report_date || '');
        setPage(p);
      }
      if (distRes.status === 'fulfilled' && distRes.value) {
        setDist(distRes.value.distribution ?? []);
      }
    } finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [search, filters]);

  useEffect(() => { fetchList(1); }, []);

  // Branch cross-reference — mirrors AgingPage.tsx exactly
  // GET /api/transactions/?movement_type=ف بيع&branch=X&page_size=500
  useEffect(() => {
    if (filters.branch === 'all') { setBranchCustomers(null); return; }
    setBranchLoading(true);
    TransactionMobileService.getList({
      movement_type: MOVEMENT_TYPES.SALE,
      branch:        filters.branch,
      page:          1,
      page_size:     500,
    }).then(res => {
      const names = new Set<string>(
        (res.movements ?? []).map(m => m.customer_name).filter(Boolean) as string[],
      );
      setBranchCustomers(names);
    }).catch(() => setBranchCustomers(null))
      .finally(() => setBranchLoading(false));
  }, [filters.branch]);

  const onSearch = (v: string) => { setSearch(v); fetchList(1, false, v, filters); };
  const applyFilters = (newF: typeof filters) => {
    setFilters(newF); setFilterOpen(false); fetchList(1, false, search, newF);
  };

  // Branch filter is client-side cross-reference (mirrors AgingPage.tsx)
  const displayRows = branchCustomers !== null
    ? rows.filter(r => branchCustomers.has(r.customer_name ?? ''))
    : rows;

  const hasActive = filters.risk !== 'all' || filters.branch !== 'all';

  return (
    <View style={{ flex:1 }}>
      <View style={{ flexDirection:'row', gap:8, padding:12, paddingBottom:0 }}>
        <SearchBar value={search} onChangeText={onSearch} placeholder="Search customer, code…" style={{ flex:1 }} />
        <TouchableOpacity onPress={() => setFilterOpen(true)} style={[S.filterBtn, hasActive && S.filterBtnActive]}>
          <Ionicons name="options-outline" size={16} color={hasActive ? '#fff' : Colors.text3} />
        </TouchableOpacity>
      </View>
      {hasActive && (
        <ActiveFilterChips
          values={filters}
          labelMap={{ risk:'Risk', branch:'Branch' }}
          onClear={k => applyFilters({ ...filters, [k]:'all' })}
        />
      )}
      {reportDate ? (
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:16, paddingTop:8 }}>
          <Ionicons name="calendar-outline" size={12} color={Colors.blue} />
          <Text style={{ fontSize:11, color:Colors.text3 }}>
            Report: <Text style={{ fontWeight:'700', color:Colors.text }}>{reportDate}</Text>
          </Text>
          {branchLoading && <ActivityIndicator size="small" color={Colors.blue} style={{ marginLeft:8 }} />}
        </View>
      ) : null}
      <SummaryStrip items={[
        { label:'Grand Total', value:fmtCurrency(grandTotal) },
        { label:'Showing',     value:`${displayRows.length}` },
        { label:'Pages',       value:`${totalPages}` },
      ]} />
      <FlatList
        data={displayRows}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal:16, paddingBottom:20 }}
        ListHeaderComponent={loading ? null : <AgingDistBar items={dist} />}
        renderItem={({ item }) => <AgingCard row={item} />}
        ListEmptyComponent={
          loading
            ? <View>{Array.from({length:5}).map((_,i)=><Skeleton key={i} lines={2}/>)}</View>
            : <EmptyState icon="search-outline" title="No results found" subtitle="Try adjusting your search or filters" />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.blue} style={{ margin:16 }} /> : null}
        onEndReached={() => { if (!loadingMore && page < totalPages) fetchList(page+1); }}
        onEndReachedThreshold={0.2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchList(1,true)} tintColor={Colors.blue} />}
      />
      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        groups={[
          { key:'risk',   label:'Risk Level', options:['all','critical','high','medium','low'] },
          { key:'branch', label:'Branch',     options:['all', ...availableBranches] },
        ]}
        values={filters}
        onChange={(k,v) => setFilters(prev => ({ ...prev, [k]:v }))}
        onReset={() => applyFilters({ risk:'all', branch:'all' })}
        onApply={() => applyFilters(filters)}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY TAB
// ─────────────────────────────────────────────────────────────────────────────
// Mirrors InventoryPage.tsx:
//   branch → GET /api/inventory/<id>/lines/?branch=X  (server-side)
//            GET /api/inventory/branch-summary/?branch=X
//            GET /api/inventory/category-breakdown/?branch=X
//   search → GET /api/inventory/<id>/lines/?search=X  (server-side)
//   KPI totals → dedicated call with page_size=1 (mirrors InventoryPage.tsx totalsData)
// ═══════════════════════════════════════════════════════════════════════════════

function InventoryTab() {
  const [search,        setSearch]        = useState('');
  const [filters,       setFilters]       = useState({ branch:'all' });
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [snapshots,     setSnapshots]     = useState<any[]>([]);
  const [snapshotId,    setSnapshotId]    = useState<string|null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [branches,      setBranches]      = useState<BranchSummary[]>([]);
  const [lines,         setLines]         = useState<InventoryLine[]>([]);
  const [totals,        setTotals]        = useState<any>(null);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);

  const branchParam = filters.branch !== 'all' ? filters.branch : undefined;

  const fetchLinesFor = async (sid: string, p: number, s: string, branch?: string) => {
    if (p > 1) setLoadingMore(true);
    try {
      // Dedicated totals call — mirrors InventoryPage.tsx totalsData (page_size=1)
      if (p === 1) {
        InventoryMobileService.getLines(sid, { page:1, page_size:1, branch, search: s||undefined })
          .then(r => setTotals(r.totals)).catch(() => {});
      }
      const res = await InventoryMobileService.getLines(sid, {
        page: p, page_size: 100, branch, search: s||undefined,
      });
      // FIX: dedup by id to prevent duplicate key warning on scroll/filter
      setLines(prev => mergeUnique(prev, res.lines, p));
      setTotalPages(res.total_pages);
      setPage(p);
    } finally { setLoadingMore(false); }
  };

  const fetchSnapshot = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true); else setRefreshing(true);
    try {
      const snap = await InventoryMobileService.listSnapshots({ page:1, page_size:50 });
      setSnapshots(snap.items ?? []);
      const latest = snap.items?.[0] ?? null;
      if (latest) {
        setSnapshotId(latest.id);
        setSnapshotLabel(latest.label || latest.source_file || latest.uploaded_at.split('T')[0]);
        await fetchLinesFor(latest.id, 1, search, branchParam);
      }
      const [brRes] = await Promise.allSettled([
        InventoryMobileService.getBranchSummary({ snapshot_id: latest?.id, branch: branchParam }),
      ]);
      if (brRes.status === 'fulfilled') setBranches(brRes.value.branches ?? []);
    } finally { setLoading(false); setRefreshing(false); }
  }, [branchParam]);

  useEffect(() => { fetchSnapshot(); }, []);

  const applyFilters = (newF: typeof filters) => {
    setFilters(newF);
    setFilterOpen(false);
    const bp = newF.branch !== 'all' ? newF.branch : undefined;
    if (snapshotId) {
      fetchLinesFor(snapshotId, 1, search, bp);
      InventoryMobileService.getBranchSummary({ snapshot_id: snapshotId, branch: bp })
        .then(r => setBranches(r.branches ?? []));
    }
  };

  const onSearch = (v: string) => {
    setSearch(v);
    if (snapshotId) fetchLinesFor(snapshotId, 1, v, branchParam);
  };

  const statusColor = (q: number) => q===0 ? Colors.red : q<30 ? Colors.orange : q<=50 ? Colors.amber : Colors.green;
  const statusLabel = (q: number) => q===0 ? 'OUT' : q<30 ? 'CRITICAL' : q<=50 ? 'LOW' : 'OK';
  const hasActive = filters.branch !== 'all';
  const allBranchNames = branches.map(b => b.branch);

  return (
    <View style={{ flex:1 }}>
    <FlatList
      data={lines}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSnapshot(true)} tintColor={Colors.blue} />}
      ListHeaderComponent={
        <>
          <View style={{ flexDirection:'row', gap:8, padding:12, paddingBottom:0 }}>
            <SearchBar value={search} onChangeText={onSearch} placeholder="Search product, code…" style={{ flex:1 }} />
            <TouchableOpacity onPress={() => setFilterOpen(true)} style={[S.filterBtn, hasActive && S.filterBtnActive]}>
              <Ionicons name="options-outline" size={16} color={hasActive ? '#fff' : Colors.text3} />
            </TouchableOpacity>
          </View>
          {hasActive && (
            <ActiveFilterChips
              values={filters}
              labelMap={{ branch:'Branch' }}
              onClear={k => applyFilters({ ...filters, [k]:'all' })}
            />
          )}
          {snapshotLabel ? (
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, margin:12, marginBottom:0, padding:10, backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, borderWidth:1, borderColor:Colors.border }}>
              <Ionicons name="archive-outline" size={13} color={Colors.blue} />
              <Text style={{ fontSize:11, color:Colors.text3 }}>Snapshot: </Text>
              <Text style={{ fontSize:11, fontWeight:'700', color:Colors.text }}>{snapshotLabel}</Text>
            </View>
          ) : null}
          {totals && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal:12, marginTop:12 }} contentContainerStyle={{ gap:8 }}>
              <MiniKpi value={fmtCurrency(totals.grand_total_value)} label="Total Value"   color={Colors.blue}  />
              <MiniKpi value={String(totals.distinct_products  ?? '—')} label="Products"    color={Colors.green} />
              <MiniKpi value={String(totals.out_of_stock_count ?? '—')} label="Out of Stock" color={Colors.red}   />
              <MiniKpi value={String(totals.critical_count     ?? '—')} label="Critical"    color={Colors.amber} />
            </ScrollView>
          )}
          {!loading && branches.length > 0 && (
            <View style={{ padding:16, paddingBottom:0 }}>
              <SectionHeader title="By Branch" />
              {branches.map((b, i) => (
                <View key={i} style={[S.card, { flexDirection:'row', alignItems:'center', gap:12, marginBottom:8 }]}>
                  <View style={{ width:36, height:36, borderRadius:BorderRadius.lg, backgroundColor:'rgba(26,92,240,0.08)', alignItems:'center', justifyContent:'center' }}>
                    <Ionicons name="storefront-outline" size={16} color={Colors.blue} />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:13, fontWeight:'700', color:Colors.text }}>{b.branch}</Text>
                    <Text style={{ fontSize:11, color:Colors.text3, marginTop:2 }}>{safe(b.total_qty).toLocaleString()} units</Text>
                  </View>
                  <Text style={{ fontSize:15, fontWeight:'700', color:Colors.text }}>{fmtCurrency(b.total_value)}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ paddingHorizontal:16, marginTop:16 }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <Text style={{ fontSize:13, fontWeight:'700', color:Colors.text2, letterSpacing:0.5, textTransform:'uppercase' }}>Product Lines</Text>
              <Text style={{ fontSize:11, color:Colors.text3 }}>{lines.length} loaded</Text>
            </View>
          </View>
          {loading && <View style={{ paddingHorizontal:16 }}>{Array.from({length:5}).map((_,i)=><Skeleton key={i} lines={3}/>)}</View>}
        </>
      }
      renderItem={({ item: l }) => {
        const qty = safe(l.quantity);
        const sc  = statusColor(qty);
        return (
          <View style={[S.card, { flexDirection:'row', alignItems:'flex-start', gap:10, marginHorizontal:16, marginBottom:8 }]}>
            <View style={{ width:8, height:8, borderRadius:4, backgroundColor:sc, marginTop:6, flexShrink:0 }} />
            <View style={{ flex:1, minWidth:0 }}>
              <Text style={{ fontSize:9.5, fontFamily:'monospace', color:Colors.text3, marginBottom:2 }}>{l.product_code}</Text>
              <Text style={{ fontSize:12.5, fontWeight:'600', color:Colors.text }} numberOfLines={1}>{l.product_name}</Text>
              <Text style={{ fontSize:10, color:Colors.text3, marginTop:2 }}>{l.product_category} · {l.branch_name}</Text>
            </View>
            <View style={{ alignItems:'flex-end', flexShrink:0 }}>
              <Text style={{ fontSize:13, fontWeight:'700', color:Colors.text }}>{fmtCurrency(l.line_value)}</Text>
              <Text style={{ fontSize:10, color:Colors.text3, marginTop:2 }}>×{qty.toLocaleString()}</Text>
              <View style={{ paddingHorizontal:6, paddingVertical:2, borderRadius:5, backgroundColor:sc+'22', marginTop:3 }}>
                <Text style={{ fontSize:9, fontWeight:'700', color:sc }}>{statusLabel(qty)}</Text>
              </View>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={!loading ? <EmptyState icon="cube-outline" title="No products found" subtitle="Try adjusting your filters" /> : null}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.blue} style={{ margin:16 }} /> : null}
      onEndReached={() => { if (!loadingMore && page < totalPages && snapshotId) fetchLinesFor(snapshotId, page+1, search, branchParam); }}
      onEndReachedThreshold={0.2}
    />
    <FilterSheet
      visible={filterOpen}
      onClose={() => setFilterOpen(false)}
      groups={[{ key:'branch', label:'Branch', options:['all', ...allBranchNames] }]}
      values={filters}
      onChange={(k,v) => setFilters(prev => ({ ...prev, [k]:v }))}
      onReset={() => applyFilters({ branch:'all' })}
      onApply={() => applyFilters(filters)}
    />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
// Mirrors TransactionsPage.tsx:
//   movement_type → trimmed raw Arabic value → GET /api/transactions/?movement_type=X
//   branch        → GET /api/transactions/?branch=X  (icontains on branch__name FK)
//   period        → periodToDates() → date_from + date_to params
//   KPI totals    → from data.totals in the same API response (not a separate call)
// ═══════════════════════════════════════════════════════════════════════════════

const PERIOD_OPTIONS = [
  { key:'all',  label:'All Time'        },
  { key:'1m',   label:'Last Month'      },
  { key:'3m',   label:'Last 3 Months'  },
  { key:'6m',   label:'Last 6 Months'  },
  { key:'12m',  label:'Last 12 Months' },
  { key:'ytd',  label:'Year to Date'   },
];

function TransactionsTab() {
  const [filters,     setFilters]     = useState({ movement_type:'all', branch:'all', period:'12m' });
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [txs,         setTxs]         = useState<Movement[]>([]);
  const [types,       setTypes]       = useState<string[]>([]);
  const [branches,    setBranches]    = useState<string[]>([]);
  const [totals,      setTotals]      = useState<{ total_in_value:number; total_out_value:number }|null>(null);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  // Load filter options dynamically from backend — same as TransactionsPage.tsx
  useEffect(() => {
    TransactionMobileService.getMovementTypes().then(r => setTypes(r.movement_types ?? [])).catch(() => {});
    TransactionMobileService.getBranches().then(r => setBranches(r.branches ?? [])).catch(() => {});
  }, []);

  // Fetch transactions — all 3 filters sent to backend simultaneously
  // Mirrors TransactionsPage.tsx fetchTransactions()
  const fetchList = useCallback(async (p = 1, isRefresh = false, f = filters) => {
    if (p === 1) isRefresh ? setRefreshing(true) : setLoading(true);
    else setLoadingMore(true);
    try {
      const dateRange = periodToDates(f.period);
      const params: Record<string,any> = { page: p, page_size: 25 };
      if (f.movement_type !== 'all') params.movement_type = f.movement_type;
      if (f.branch !== 'all')        params.branch        = f.branch;
      if (dateRange.date_from)       params.date_from     = dateRange.date_from;
      if (dateRange.date_to)         params.date_to       = dateRange.date_to;

      const res = await TransactionMobileService.getList(params);
      // FIX: dedup by id to prevent duplicate key warning on scroll/filter
      setTxs(prev => mergeUnique(prev, res.movements, p));
      setTotalPages(res.total_pages);
      setTotals(res.totals);
      setPage(p);
    } finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [filters]);

  useEffect(() => { fetchList(1); }, []);

  const applyFilters = (newF: typeof filters) => {
    setFilters(newF); setFilterOpen(false); fetchList(1, false, newF);
  };

  const hasActive = filters.movement_type !== 'all' || filters.branch !== 'all' || filters.period !== '12m';

  // Active filter chips — show period label not key
  const activeChipValues: Record<string,string> = {};
  if (filters.movement_type !== 'all') activeChipValues.movement_type = filters.movement_type;
  if (filters.branch !== 'all')        activeChipValues.branch        = filters.branch;
  if (filters.period !== '12m')        activeChipValues.period        = PERIOD_OPTIONS.find(o => o.key === filters.period)?.label ?? filters.period;

  return (
    <View style={{ flex:1 }}>
      <View style={{ flexDirection:'row', gap:8, padding:12, paddingBottom:0 }}>
        <View style={[S.searchStatic, { flex:1 }]}>
          <Ionicons name="search-outline" size={14} color={Colors.text3} />
          <Text style={{ fontSize:12, color:Colors.text3 }}>Search product, customer…</Text>
        </View>
        <TouchableOpacity onPress={() => setFilterOpen(true)} style={[S.filterBtn, hasActive && S.filterBtnActive]}>
          <Ionicons name="options-outline" size={16} color={hasActive ? '#fff' : Colors.text3} />
        </TouchableOpacity>
      </View>
      {hasActive && (
        <ActiveFilterChips
          values={activeChipValues}
          labelMap={{ movement_type:'Type', branch:'Branch', period:'Period' }}
          onClear={key => {
            const defaults: Record<string,string> = { movement_type:'all', branch:'all', period:'12m' };
            applyFilters({ ...filters, [key]: defaults[key] });
          }}
        />
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal:12, marginTop:12 }} contentContainerStyle={{ gap:8 }}>
        <MiniKpi value={fmtCurrency(totals?.total_out_value)} label="Total Out"  color={Colors.red}   />
        <MiniKpi value={fmtCurrency(totals?.total_in_value)}  label="Total In"   color={Colors.green} />
        <MiniKpi value={fmtCurrency(Math.abs(safe(totals?.total_out_value) - safe(totals?.total_in_value)))} label="Net" color={Colors.blue} />
      </ScrollView>
      <FlatList
        data={txs}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding:16, paddingBottom:24 }}
        renderItem={({ item: t }) => {
          const isIn  = safe(t.qty_in) > 0;
          const color = isIn ? Colors.green : Colors.red;
          const val   = isIn ? t.total_in : t.total_out;
          const qty   = isIn ? t.qty_in  : t.qty_out;
          return (
            <View style={[S.card, { flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 }]}>
              <View style={{ width:34, height:34, borderRadius:BorderRadius.lg, backgroundColor: isIn ? Colors.greenBg : Colors.redBg, alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Ionicons name={isIn ? 'arrow-down-outline' : 'arrow-up-outline'} size={16} color={color} />
              </View>
              <View style={{ flex:1, minWidth:0 }}>
                <Text style={{ fontSize:12.5, fontWeight:'600', color:Colors.text }} numberOfLines={1}>{t.material_name || t.material_code}</Text>
                <View style={{ flexDirection:'row', gap:6, marginTop:3, alignItems:'center', flexWrap:'wrap' }}>
                  {t.branch_name_resolved && <BranchTag label={t.branch_name_resolved} />}
                  <Text style={{ fontSize:10.5, color:Colors.text3 }}>{t.movement_type_display || t.movement_type}</Text>
                  <Text style={{ fontSize:10, color:Colors.text3 }}>{fmtDate(t.movement_date)}</Text>
                </View>
              </View>
              <View style={{ alignItems:'flex-end', flexShrink:0 }}>
                <Text style={{ fontSize:13, fontWeight:'700', color }}>{isIn?'+':'-'}{fmtCurrency(val)}</Text>
                <Text style={{ fontSize:10, color:Colors.text3, marginTop:2 }}>×{safe(qty).toLocaleString()}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading
            ? <View>{Array.from({length:6}).map((_,i)=><Skeleton key={i} lines={2}/>)}</View>
            : <EmptyState icon="swap-horizontal-outline" title="No transactions" subtitle="Try adjusting your filters" />
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.blue} style={{ margin:16 }} /> : null}
        onEndReached={() => { if (!loadingMore && page < totalPages) fetchList(page+1); }}
        onEndReachedThreshold={0.2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchList(1,true)} tintColor={Colors.blue} />}
      />
      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        groups={[
          {
            key:     'movement_type',
            label:   'Movement Type',
            options: ['all', ...types],
          },
          {
            key:     'branch',
            label:   'Branch',
            options: ['all', ...branches],
          },
          {
            key:     'period',
            label:   'Period',
            options: PERIOD_OPTIONS.map(o => o.key),
          },
        ]}
        values={filters}
        onChange={(k,v) => setFilters(prev => ({ ...prev, [k]:v }))}
        onReset={() => applyFilters({ movement_type:'all', branch:'all', period:'12m' })}
        onApply={() => applyFilters(filters)}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL SCREEN ROOT
// ═══════════════════════════════════════════════════════════════════════════════

type TabName = 'Aging' | 'Inventory' | 'Transactions';

export function ControlScreen({ route }: any) {
  const defaultTab = (
    route?.params?.tab === 'aging'        ? 'Aging'        :
    route?.params?.tab === 'inventory'    ? 'Inventory'    :
    route?.params?.tab === 'transactions' ? 'Transactions' : 'Aging'
  ) as TabName;

  const [activeTab, setActiveTab] = useState<TabName>(defaultTab);

  return (
    <View style={{ flex:1, backgroundColor:Colors.bg }}>
      <LinearGradient colors={[Colors.navy2, Colors.navy3]} style={S.pageHeader} start={{ x:0,y:0 }} end={{ x:1,y:1 }}>
        <Text style={S.pageHeaderLabel}>WEEG PLATFORM</Text>
        <Text style={S.pageHeaderTitle}>Control Panel</Text>
        <Text style={S.pageHeaderSub}>Aging · Inventory · Transactions</Text>
      </LinearGradient>
      <View style={S.tabBar}>
        {(['Aging','Inventory','Transactions'] as TabName[]).map(tab => (
          <TouchableOpacity key={tab} style={[S.tabItem, activeTab===tab && S.tabItemActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[S.tabLabel, activeTab===tab && S.tabLabelActive]}>{tab}</Text>
            {activeTab===tab && <View style={S.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex:1 }}>
        {activeTab==='Aging'        && <AgingTab />}
        {activeTab==='Inventory'    && <InventoryTab />}
        {activeTab==='Transactions' && <TransactionsTab />}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  pageHeader:      { padding:20, paddingTop:18, paddingBottom:16 },
  pageHeaderLabel: { fontSize:9.5, fontWeight:'700', color:'rgba(255,255,255,0.4)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:4 },
  pageHeaderTitle: { fontSize:22, fontWeight:'700', color:'#fff', letterSpacing:-0.5 },
  pageHeaderSub:   { fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:2 },
  tabBar:          { flexDirection:'row', backgroundColor:Colors.surface, borderBottomWidth:1, borderBottomColor:Colors.border },
  tabItem:         { flex:1, alignItems:'center', paddingVertical:13, position:'relative' },
  tabItemActive:   {},
  tabLabel:        { fontSize:11.5, fontWeight:'600', color:Colors.text3 },
  tabLabelActive:  { color:Colors.blue },
  tabIndicator:    { position:'absolute', bottom:0, left:'15%', right:'15%', height:2, borderRadius:1, backgroundColor:Colors.blue },
  card:            { backgroundColor:Colors.surface, borderRadius:BorderRadius.xl, padding:14, borderWidth:1, borderColor:Colors.border, ...Shadow.sm },
  cardTitle:       { fontSize:13.5, fontWeight:'700', color:Colors.text, marginBottom:14 },
  filterBtn:       { width:44, height:44, borderRadius:BorderRadius.lg, backgroundColor:Colors.surface, borderWidth:1, borderColor:Colors.border, alignItems:'center', justifyContent:'center', flexShrink:0 },
  filterBtnActive: { backgroundColor:Colors.blue, borderColor:Colors.blue },
  searchStatic:    { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:Colors.surface, borderRadius:BorderRadius.lg, borderWidth:1, borderColor:Colors.border, paddingHorizontal:14, height:44 },
  skeleton:        { backgroundColor:Colors.bg, borderRadius:4 },
});