import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import {
  DashboardService,
  AgingService,
  type DashboardKPIs,
  type AgingRiskItem,
  type MonthlySummaryItem,
} from '../../lib/mobileDataService';

const { width } = Dimensions.get('window');
const CARD_W = (width - Spacing.base * 2 - 12) / 2;

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined): string => {
  const v = Number(n);
  if (n == null || isNaN(v)) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
};

const safeNum = (n: number | null | undefined, fallback = 0): number =>
  n == null || isNaN(Number(n)) ? fallback : Number(n);

const fmtCurrency = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? '—' : `${fmt(n)} DL`;

// ── Sparkline (pure RN Views — no SVG dep) ───────────────────────────────────

function Sparkline({ color = Colors.indigo600 }: { color?: string }) {
  const pts = [30, 42, 35, 55, 40, 60, 45, 65, 50, 70, 55, 72];
  const H = 28;
  const W = CARD_W - 40;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const px = (i: number) => (i / (pts.length - 1)) * W;
  const py = (v: number) => H - ((v - min) / (max - min + 1)) * H;

  return (
    <View style={{ height: H, overflow: 'hidden', marginTop: 8 }}>
      {pts.map((v, i) => {
        if (i === 0) return null;
        const x1 = px(i - 1), y1 = py(pts[i - 1]), x2 = px(i), y2 = py(v);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        return (
          <View
            key={i}
            style={{
              position: 'absolute', left: x1, top: y1,
              width: len, height: 2, backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: '0 50%',
            } as any}
          />
        );
      })}
    </View>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  title, value, trend, icon, isPositive, color, loading,
}: {
  title: string;
  value: string;
  trend?: number | null;
  icon: string;
  isPositive?: boolean;
  color: string;
  loading?: boolean;
}) {
  const trendColor = isPositive ? '#16a34a' : '#dc2626';

  return (
    <View style={[st.kpiCard, Shadow.sm]}>
      <View style={st.kpiTop}>
        <View style={[st.kpiIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        {trend != null && (
          <Text style={[st.kpiTrend, { color: trendColor }]}>
            {isPositive ? '↑' : '↓'} {safeNum(trend) >= 0 ? Math.abs(safeNum(trend)).toFixed(1) : Math.abs(safeNum(trend)).toFixed(1)}%
          </Text>
        )}
      </View>
      <Text style={st.kpiLabel}>{title}</Text>
      {loading ? (
        <View style={{ height: 24, justifyContent: 'center' }}>
          <View style={[st.skeleton, { width: 80, height: 18 }]} />
        </View>
      ) : (
        <Text style={st.kpiValue}>{value}</Text>
      )}
      <Sparkline color={color} />
    </View>
  );
}

// ── Risk Customer Row ─────────────────────────────────────────────────────────

function RiskCustomerRow({
  item,
  onPress,
}: {
  item: AgingRiskItem;
  onPress?: () => void;
}) {
  const riskColors: Record<string, string> = {
    critical: '#dc2626',
    high:     '#f97316',
    medium:   '#f59e0b',
    low:      '#16a34a',
  };
  const riskColor = riskColors[item.risk_score] ?? Colors.gray500;
  const overduePct = item.total > 0 ? (item.overdue_total / item.total) * 100 : 0;

  return (
    <TouchableOpacity
      style={[st.riskRow, Shadow.sm]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={st.riskTop}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={st.riskName} numberOfLines={1}>
            {item.customer_name || item.account}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <Text style={{ fontSize: 12, color: Colors.gray500 }}>
              {fmtCurrency(item.total)}
            </Text>
            <View style={[st.riskBadge, { backgroundColor: riskColor }]}>
              <Text style={st.riskBadgeTxt}>{item.risk_score.toUpperCase()}</Text>
            </View>
            {item.branch && (
              <Text style={{ fontSize: 11, color: Colors.gray400 }}>{item.branch}</Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>
            {fmtCurrency(item.overdue_total)}
          </Text>
          <Text style={{ fontSize: 10, color: Colors.gray400, marginTop: 1 }}>overdue</Text>
        </View>
      </View>

      {/* Overdue progress bar */}
      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 10, color: Colors.gray400 }}>Overdue ratio</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: riskColor }}>
            {safeNum(overduePct).toFixed(0)}%
          </Text>
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: Colors.gray100, overflow: 'hidden' }}>
          <LinearGradient
            colors={[riskColor + '80', riskColor]}
            style={{ width: `${Math.min(100, overduePct)}%` as any, height: 5, borderRadius: 3 }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Global Risk Gauge ─────────────────────────────────────────────────────────

function RiskGauge({ criticalCount, totalCount }: { criticalCount: number; totalCount: number }) {
  const pct = totalCount > 0 ? Math.min(90, (criticalCount / totalCount) * 100 + 20) : 20;
  const riskLevel = criticalCount > 1 ? 'HIGH' : criticalCount === 1 ? 'MEDIUM' : 'LOW';
  const riskColor = criticalCount > 1 ? '#dc2626' : criticalCount === 1 ? '#f59e0b' : '#16a34a';

  return (
    <View style={[st.riskGauge, Shadow.sm]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ionicons name="shield-outline" size={20} color={riskColor} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.foreground }}>
          Global Risk Level
        </Text>
        <View style={{ marginLeft: 'auto' as any, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: riskColor + '20' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: riskColor }}>{riskLevel}</Text>
        </View>
      </View>
      <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
        <LinearGradient
          colors={['#16a34a', '#f59e0b', '#dc2626']}
          style={{ height: 8, borderRadius: 4 }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
        <View style={{
          position: 'absolute', top: -3,
          left: `${pct}%` as any,
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: '#fff', borderWidth: 2, borderColor: Colors.foreground,
        }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: '#16a34a' }}>Low</Text>
        <Text style={{ fontSize: 10, color: '#f59e0b' }}>Medium</Text>
        <Text style={{ fontSize: 10, color: '#dc2626' }}>High</Text>
      </View>
    </View>
  );
}

// ── Credit Health Row ─────────────────────────────────────────────────────────

function CreditMetricRow({
  label, value, unit, good, loading,
}: {
  label: string; value: number; unit: string; good: boolean; loading: boolean;
}) {
  const color = good ? '#16a34a' : '#dc2626';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray100 }}>
      <Text style={{ fontSize: 13, color: Colors.gray600 }}>{label}</Text>
      {loading ? (
        <View style={[st.skeleton, { width: 60, height: 14 }]} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color }}>
            {safeNum(value).toFixed(1)}{unit}
          </Text>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: color + '18' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color }}>{good ? 'GOOD' : 'ALERT'}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DashboardScreen({ navigation }: any) {
  const [kpis, setKpis]       = useState<DashboardKPIs | null>(null);
  const [monthly, setMonthly] = useState<MonthlySummaryItem[]>([]);
  const [topRisk, setTopRisk] = useState<AgingRiskItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [kpisRes, monthlyRes, riskRes] = await Promise.allSettled([
        DashboardService.getDashboardKPIs(),
        DashboardService.getMonthlySummary(),
        AgingService.getTopRisk(5),
      ]);

      if (kpisRes.status === 'fulfilled')   setKpis(kpisRes.value);
      if (monthlyRes.status === 'fulfilled') setMonthly(monthlyRes.value.summary ?? []);
      if (riskRes.status === 'fulfilled')   setTopRisk(riskRes.value.top_risk ?? []);

      if (kpisRes.status === 'rejected') {
        setError('Failed to load KPIs. Check your connection.');
      }
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(true);
  };

  // Compute sales trend from last 2 months
  const salesTrend = (() => {
    const sorted = [...monthly].sort((a, b) =>
      a.year * 100 + a.month - (b.year * 100 + b.month),
    );
    const last = sorted.slice(-2);
    if (last.length < 2 || last[0].total_sales === 0) return null;
    return ((last[1].total_sales - last[0].total_sales) / last[0].total_sales) * 100;
  })();

  const criticalCount = topRisk.filter(r => r.risk_score === 'critical').length;
  const riskLevel = criticalCount > 1 ? 'HIGH' : criticalCount === 1 ? 'MEDIUM' : 'LOW';
  const riskColor = criticalCount > 1 ? '#dc2626' : criticalCount === 1 ? '#f59e0b' : '#16a34a';

  return (
    <ScrollView
      style={st.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.indigo600} />}
    >
      {/* ── Header gradient ── */}
      <LinearGradient
        colors={[Colors.indigo600, Colors.violet600]}
        style={st.headerGrad}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View>
          <Text style={st.headerTitle}>Dashboard</Text>
          <Text style={st.headerSub}>Business overview</Text>
        </View>
        <View style={[st.headerRiskBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <View style={[st.riskDot, { backgroundColor: riskColor }]} />
          <Text style={st.riskTxt}>Risk: {riskLevel}</Text>
        </View>
      </LinearGradient>

      {/* ── Error banner ── */}
      {error && (
        <View style={st.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
          <Text style={st.errorTxt} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={() => fetchAll()} style={st.retryBtn}>
            <Text style={st.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── KPI Grid ── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Key Metrics</Text>
        <View style={st.kpiGrid}>
          <KPICard
            title="Total Sales"
            value={kpis ? fmtCurrency(kpis.totalSales) : '—'}
            trend={salesTrend}
            isPositive={(salesTrend ?? 0) >= 0}
            icon="trending-up-outline"
            color={Colors.indigo600}
            loading={loading}
          />
          <KPICard
            title="Stock Value"
            value={kpis ? fmtCurrency(kpis.stockValue) : '—'}
            icon="cube-outline"
            color="#f59e0b"
            loading={loading}
          />
          <KPICard
            title="Receivables"
            value={kpis ? fmtCurrency(kpis.totalReceivables) : '—'}
            icon="wallet-outline"
            color="#dc2626"
            loading={loading}
          />
          <KPICard
            title="Collection"
            value={kpis ? `${kpis.collectionRate.toFixed(1)}%` : '—'}
            icon="checkmark-circle-outline"
            color="#16a34a"
            loading={loading}
            isPositive={kpis ? kpis.collectionRate >= 70 : true}
          />
        </View>
      </View>

      {/* ── Credit Health ── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Credit Health</Text>
        <View style={[st.card, Shadow.sm]}>
          <CreditMetricRow
            label="Collection Rate"
            value={kpis?.collectionRate ?? 0}
            unit="%"
            good={safeNum(kpis?.collectionRate) >= 70}
            loading={loading}
          />
          <CreditMetricRow
            label="Overdue Rate"
            value={kpis?.overdueRate ?? 0}
            unit="%"
            good={safeNum(kpis?.overdueRate) <= 20}
            loading={loading}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
            <Text style={{ fontSize: 13, color: Colors.gray600 }}>DSO (avg payment days)</Text>
            {loading ? (
              <View style={[st.skeleton, { width: 60, height: 14 }]} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '700', color: safeNum(kpis?.dso) <= 90 ? '#16a34a' : '#f59e0b' }}>
                {safeNum(kpis?.dso).toFixed(0)} days
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Global Risk Gauge ── */}
      <View style={{ paddingHorizontal: Spacing.base }}>
        <RiskGauge criticalCount={criticalCount} totalCount={topRisk.length} />
      </View>

      {/* ── Top Risky Customers ── */}
      <View style={st.section}>
        <View style={st.sectionHdr}>
          <Text style={st.sectionTitle}>Top Risky Customers</Text>
          <TouchableOpacity onPress={() => navigation?.navigate?.('Control')}>
            <Text style={st.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={[st.card, Shadow.sm, { padding: 32, alignItems: 'center' }]}>
            <ActivityIndicator color={Colors.indigo600} />
            <Text style={{ fontSize: 13, color: Colors.gray500, marginTop: 10 }}>Loading customers…</Text>
          </View>
        ) : topRisk.length === 0 ? (
          <View style={[st.card, Shadow.sm, { padding: 32, alignItems: 'center' }]}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#16a34a" />
            <Text style={{ fontSize: 14, color: Colors.gray500, marginTop: 8 }}>No risky customers</Text>
          </View>
        ) : (
          topRisk.map(item => (
            <RiskCustomerRow
              key={item.id}
              item={item}
              onPress={() => navigation?.navigate?.('Control', { tab: 'aging', customerId: item.id })}
            />
          ))
        )}
      </View>

      {/* ── Monthly Quick Summary ── */}
      {monthly.length > 0 && (
        <View style={st.section}>
          <Text style={st.sectionTitle}>Monthly Trend</Text>
          <View style={[st.card, Shadow.sm]}>
            {[...monthly]
              .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
              .slice(-4)
              .map((m, i) => {
                const maxSales = Math.max(...monthly.map(x => x.total_sales), 1);
                const pct = (m.total_sales / maxSales) * 100;
                return (
                  <View key={i} style={{ marginBottom: i < 3 ? 12 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: Colors.gray500 }}>
                        {m.month_label} {m.year}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.foreground }}>
                        {fmtCurrency(m.total_sales)}
                      </Text>
                    </View>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: Colors.gray100, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={[Colors.indigo600 + '80', Colors.indigo600]}
                        style={{ width: `${pct}%` as any, height: 5, borderRadius: 3 }}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      />
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.gray50 },
  headerGrad:   { padding: 20, paddingTop: 28, paddingBottom: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:  { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerRiskBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  riskDot:      { width: 8, height: 8, borderRadius: 4 },
  riskTxt:      { fontSize: 12, fontWeight: '700', color: '#fff' },
  riskGauge:    { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, marginBottom: 4, borderWidth: 1, borderColor: Colors.gray100 },
  section:      { padding: Spacing.base, paddingBottom: 0 },
  sectionHdr:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.foreground, marginBottom: 12 },
  seeAll:       { fontSize: 13, color: Colors.indigo600, fontWeight: '600' },
  card:         { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, borderWidth: 1, borderColor: Colors.gray100 },
  kpiGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard:      { width: CARD_W, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 14, borderWidth: 1, borderColor: Colors.gray100 },
  kpiTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  kpiIcon:      { width: 36, height: 36, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  kpiTrend:     { fontSize: 12, fontWeight: '700' },
  kpiLabel:     { fontSize: 11, color: Colors.gray500, marginBottom: 2 },
  kpiValue:     { fontSize: 17, fontWeight: '800', color: Colors.foreground },
  riskRow:      { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.gray100 },
  riskTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  riskName:     { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  riskBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  riskBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  errorBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, margin: Spacing.base, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  errorTxt:     { flex: 1, fontSize: 12, color: '#dc2626' },
  retryBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#dc2626' },
  retryTxt:     { fontSize: 12, fontWeight: '700', color: '#fff' },
  skeleton:     { backgroundColor: Colors.gray100, borderRadius: 4 },
});