import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Image, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../../constants/theme';

const { width } = Dimensions.get('window');

const WEEG_BLUE = '#1a6fe8';
const WEEG_ORANGE = '#e87c1a';

const problemSolutions = [
  { problem: 'Time-consuming manual Excel reports', solution: 'Automatic import and instant reports', icon: 'cloud-upload-outline' },
  { problem: 'Difficulty tracking performance', solution: 'Real-time KPI calculations', icon: 'trending-up-outline' },
  { problem: 'Decisions based on intuition', solution: 'AI predictions and data-driven recommendations', icon: 'sparkles-outline' },
  { problem: 'Missed customer risk alerts', solution: 'Intelligent notifications and anomaly detection', icon: 'notifications-outline' },
];

const analyticsFeatures = [
  { icon: 'arrow-up-circle-outline', title: 'Automated Excel Import', description: 'Import your data with one click', color: WEEG_BLUE },
  { icon: 'trending-up-outline', title: 'Real-time KPI Calculation', description: 'Track your indicators instantly', color: WEEG_BLUE },
  { icon: 'document-text-outline', title: 'Detailed Report Generation', description: 'Complete and customizable reports', color: WEEG_BLUE },
  { icon: 'arrow-down-circle-outline', title: 'PDF/Excel Export', description: 'Export your data easily', color: WEEG_BLUE },
];

const aiFeatures = [
  { icon: 'trending-up-outline', title: 'Sales Predictions', description: 'Anticipate your future performance', color: Colors.purple600 },
  { icon: 'warning-outline', title: 'Anomaly Detection', description: 'Identify problems before they worsen', color: Colors.purple600 },
  { icon: 'trending-down-outline', title: 'Customer Churn Analysis', description: 'Predict customer loss risks', color: Colors.purple600 },
  { icon: 'cube-outline', title: 'Inventory Optimization', description: 'Intelligent restocking recommendations', color: Colors.purple600 },
  { icon: 'calendar-outline', title: 'Seasonal Patterns', description: 'Identify sales trends and cycles', color: Colors.purple600 },
];

const alertFeatures = [
  { icon: 'settings-outline', title: 'Configurable Alert Thresholds', description: 'Define your own criteria', color: Colors.orange500 },
  { icon: 'notifications-outline', title: 'Real-time Notifications', description: 'Receive instant alerts', color: Colors.orange500 },
  { icon: 'alert-circle-outline', title: 'Proactive Risk Alerts', description: 'Anticipate problems', color: Colors.orange500 },
  { icon: 'time-outline', title: 'Alert History', description: 'View complete history', color: Colors.orange500 },
];

const steps = [
  { number: '01', title: 'Import Your Data', description: 'Upload your Excel files in just a few clicks', icon: 'cloud-upload-outline', colors: [Colors.blue600, Colors.cyan500] as [string, string] },
  { number: '02', title: 'Analyze Automatically', description: 'AI calculates your KPIs and identifies trends', icon: 'sparkles-outline', colors: [Colors.purple600, Colors.pink500] as [string, string] },
  { number: '03', title: 'Receive Alerts', description: 'Intelligent notifications and real-time predictions', icon: 'notifications-outline', colors: [Colors.orange500, Colors.red500] as [string, string] },
  { number: '04', title: 'Act Effectively', description: 'Make decisions based on concrete recommendations', icon: 'checkmark-circle-outline', colors: [WEEG_BLUE, Colors.purple600] as [string, string] },
];

const faqs = [
  { q: 'How do I import my data?', a: 'You can import your data in just a few clicks through our intuitive interface. We support Excel files (.xlsx, .xls), CSV, and Google Sheets.' },
  { q: 'Is the AI accurate?', a: 'Our AI uses advanced machine learning algorithms. The average accuracy of our predictions is 92%. The more you use the platform, the better the predictions become.' },
  { q: 'Can I customize KPIs?', a: 'Absolutely! You can create custom KPIs according to your specific needs, define your own calculation formulas, and configure alert thresholds adapted to your business.' },
  { q: 'What about data security?', a: 'Your data is encrypted in transit (SSL/TLS) and at rest (AES-256). We are GDPR compliant and host your data in Europe.' },
  { q: 'Can I change my plan at any time?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.' },
];

export function LandingScreen({ navigation }: any) {
  const [activeRole, setActiveRole] = useState<'agent' | 'manager' | 'admin'>('manager');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const roleContent = {
    agent: {
      title: 'For Agents',
      subtitle: 'Save time on your daily reports',
      benefits: [
        { icon: 'cloud-upload-outline', text: 'Quick data import' },
        { icon: 'grid-outline', text: 'Customizable dashboards' },
        { icon: 'eye-outline', text: 'Instant customer history' },
      ],
    },
    manager: {
      title: 'For Managers',
      subtitle: 'Lead your team with powerful insights',
      benefits: [
        { icon: 'document-text-outline', text: 'Detailed multi-period reports' },
        { icon: 'people-outline', text: 'Simplified team management' },
        { icon: 'bar-chart-outline', text: 'Performance comparison' },
      ],
    },
    admin: {
      title: 'For Admins',
      subtitle: 'Control and secure your platform',
      benefits: [
        { icon: 'people-outline', text: 'User management' },
        { icon: 'shield-checkmark-outline', text: 'Account validation' },
        { icon: 'lock-closed-outline', text: 'Permission control' },
      ],
    },
  };

  const FeatureSection = ({ title, icon, iconBg, features }: any) => (
    <View style={styles.featureSection}>
      <View style={styles.featureSectionHeader}>
        <LinearGradient colors={iconBg} style={styles.featureSectionIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={icon} size={20} color="white" />
        </LinearGradient>
        <Text style={styles.featureSectionTitle}>{title}</Text>
      </View>
      <View style={styles.featuresGrid}>
        {features.map((f: any, i: number) => (
          <View key={i} style={[styles.featureCard, Shadow.sm]}>
            <Ionicons name={f.icon as any} size={26} color={f.color} style={styles.featureIcon} />
            <Text style={styles.featureTitle}>{f.title}</Text>
            <Text style={styles.featureDesc}>{f.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Sticky Nav */}
      <View style={styles.nav}>
        {/* Logo: flex:1 + shrinks, image fills 100% of available space */}
        <View style={styles.navLogoWrapper}>
          <Image
            source={require('../../assets/logo.jpeg')}
            style={styles.navLogoImg}
            resizeMode="contain"
          />
        </View>

        {/* Buttons: never shrink, always their natural size */}
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navGhost}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.navGhostText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <LinearGradient
              colors={[WEEG_BLUE, WEEG_ORANGE]}
              style={styles.navCTA}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.navCTAText}>Start</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 1. HERO */}
        <LinearGradient colors={['#eff6ff', '#ffffff', '#fff7ed']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {/* AI Badge */}
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeInner}>
              <Ionicons name="sparkles-outline" size={14} color={WEEG_BLUE} />
              <Text style={styles.heroBadgeText}>Powered by Artificial Intelligence</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            {'Where Data\n'}
            <Text style={styles.heroTitleAccent}>Finds Balance</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            The intelligent platform that <Text style={styles.bold}>automates your reports</Text>, <Text style={styles.bold}>calculates your KPIs</Text>, and <Text style={styles.bold}>predicts your business performance</Text> in real-time
          </Text>

          <View style={styles.heroCTAs}>
            <TouchableOpacity style={styles.ctaSecondary}>
              <Ionicons name="play-circle-outline" size={20} color={Colors.foreground} />
              <Text style={styles.ctaSecondaryText}>Watch Demo</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Logo */}
          <View style={styles.heroLogoContainer}>
            <Image
              source={require('../../assets/logo.jpeg')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* 2. PROBLEMS/SOLUTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Challenges, <Text style={styles.gradientText}>Our Solutions</Text></Text>
          <Text style={styles.sectionSubtitle}>Weeg solves the problems you face every day</Text>

          {problemSolutions.map((item, i) => (
            <View key={i} style={[styles.problemCard, Shadow.sm]}>
              <LinearGradient colors={[WEEG_BLUE, WEEG_ORANGE]} style={styles.problemIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name={item.icon as any} size={22} color="white" />
              </LinearGradient>
              <View style={styles.problemContent}>
                <View style={styles.problemRow}>
                  <Ionicons name="close-circle" size={16} color={Colors.red500} />
                  <Text style={styles.problemText}>{item.problem}</Text>
                </View>
                <View style={styles.problemRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.solutionText}>{item.solution}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* 3. KEY FEATURES */}
        <View style={[styles.section, styles.sectionGray]}>
          <View style={styles.featureBadge}>
            <Ionicons name="star-outline" size={14} color={WEEG_BLUE} />
            <Text style={styles.featureBadgeText}>Powerful Features</Text>
          </View>
          <Text style={styles.sectionTitle}>Everything You Need</Text>

          <FeatureSection
            title="Analytics & Reporting"
            icon="bar-chart-outline"
            iconBg={[Colors.blue500, WEEG_BLUE]}
            features={analyticsFeatures}
          />
          <FeatureSection
            title="Artificial Intelligence"
            icon="brain-outline"
            iconBg={[Colors.purple600, Colors.pink500]}
            features={aiFeatures}
          />
          <FeatureSection
            title="Alerts & Monitoring"
            icon="notifications-outline"
            iconBg={[Colors.orange500, Colors.red500]}
            features={alertFeatures}
          />
        </View>

        {/* 4. BY ROLE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adapted to <Text style={styles.gradientText}>Every Role</Text></Text>
          <Text style={styles.sectionSubtitle}>Features designed for every member of your team</Text>

          <View style={styles.roleTabs}>
            {(['agent', 'manager', 'admin'] as const).map(role => (
              <TouchableOpacity key={role} onPress={() => setActiveRole(role)}>
                {activeRole === role ? (
                  <LinearGradient colors={[WEEG_BLUE, WEEG_ORANGE]} style={styles.roleTabActive} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.roleTabActiveText}>{role.charAt(0).toUpperCase() + role.slice(1)}s</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.roleTabInactive}>
                    <Text style={styles.roleTabInactiveText}>{role.charAt(0).toUpperCase() + role.slice(1)}s</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <LinearGradient colors={['#eff6ff', '#fff7ed']} style={styles.roleContent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.roleTitle}>{roleContent[activeRole].title}</Text>
            <Text style={styles.roleSubtitle}>{roleContent[activeRole].subtitle}</Text>
            {roleContent[activeRole].benefits.map((b, i) => (
              <View key={i} style={[styles.roleBenefit, Shadow.sm]}>
                <Ionicons name={b.icon as any} size={24} color={WEEG_BLUE} />
                <Text style={styles.roleBenefitText}>{b.text}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* 5. HOW IT WORKS */}
        <LinearGradient colors={[WEEG_BLUE, '#0f4fa8', '#1a1a2e']} style={styles.howSection} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.howTitle}>How It Works</Text>
          <Text style={styles.howSubtitle}>4 simple steps to transform your business</Text>

          {steps.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <LinearGradient colors={step.colors} style={styles.stepIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name={step.icon as any} size={24} color="white" />
              </LinearGradient>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
              </View>
            </View>
          ))}
        </LinearGradient>

        {/* 6. SEE WEEG IN ACTION */}
        <View style={[styles.section, styles.sectionGray]}>
          <View style={styles.demoCard}>
            <View style={styles.demoLeft}>
              <Text style={styles.demoTitle}>See Weeg in Action</Text>
              <Text style={styles.demoDesc}>Watch how Weeg transforms your data into actionable insights in just a few clicks</Text>
              <TouchableOpacity>
                <LinearGradient colors={[WEEG_BLUE, WEEG_ORANGE]} style={styles.demoButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="play-circle-outline" size={18} color="white" />
                  <Text style={styles.demoButtonText}>Watch Demo Video</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.demoRight}>
              <View style={[styles.demoVideoThumb, { backgroundColor: WEEG_BLUE }]}>
                <Ionicons name="play-circle" size={48} color="white" />
              </View>
            </View>
          </View>
        </View>

        {/* 7. FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>Find answers to your questions</Text>

          {faqs.map((faq, i) => (
            <TouchableOpacity key={i} onPress={() => setOpenFaq(openFaq === i ? null : i)} style={[styles.faqItem, Shadow.sm]}>
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.gray500} />
              </View>
              {openFaq === i && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    zIndex: 100,
    minHeight: 58,
    overflow: 'hidden',
  },
  // Logo wrapper takes all remaining space and never pushes buttons
  navLogoWrapper: {
    flex: 1,
    minWidth: 0,          // allows the wrapper to shrink below its content size
    marginRight: 10,
    height: 36,
  },
  // Image fills 100% of the wrapper width — shrinks automatically
  navLogoImg: {
    width: '100%',
    height: '100%',
  },
  // Buttons side: never shrinks, never wraps
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    flexGrow: 0,
  },
  navGhost: { paddingHorizontal: 10, paddingVertical: 7 },
  navGhostText: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  navCTA: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.lg },
  navCTAText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  // Hero
  hero: { paddingHorizontal: Spacing.base, paddingTop: 32, paddingBottom: 40 },
  heroBadge: { alignSelf: 'flex-start', marginBottom: 20 },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: WEEG_BLUE },
  heroBadgeInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  heroTitle: { fontSize: 34, fontWeight: '900', lineHeight: 42, marginBottom: 16, color: Colors.foreground },
  heroTitleAccent: { color: WEEG_BLUE },
  heroSubtitle: { fontSize: 15, color: Colors.gray500, lineHeight: 24, marginBottom: 28 },
  bold: { fontWeight: '700', color: Colors.foreground },
  heroCTAs: { flexDirection: 'row', gap: 12, marginBottom: 28, flexWrap: 'wrap' },
  ctaSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: BorderRadius.xl, borderWidth: 2, borderColor: Colors.gray200, backgroundColor: Colors.white },
  ctaSecondaryText: { fontSize: 15, fontWeight: '600', color: Colors.foreground },
  heroLogoContainer: { borderRadius: BorderRadius['2xl'], overflow: 'hidden', borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: Colors.white, padding: 16, alignItems: 'center' },
  heroLogo: { width: '80%', height: 120 },

  // Sections
  section: { paddingHorizontal: Spacing.base, paddingVertical: 40 },
  sectionGray: { backgroundColor: Colors.gray50 },
  sectionTitle: { fontSize: 26, fontWeight: '800', color: Colors.foreground, marginBottom: 8, textAlign: 'center' },
  sectionSubtitle: { fontSize: 15, color: Colors.gray500, textAlign: 'center', marginBottom: 24 },
  gradientText: { color: WEEG_BLUE },

  // Problem cards
  problemCard: { flexDirection: 'row', gap: 14, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: Colors.gray100 },
  problemIcon: { width: 52, height: 52, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  problemContent: { flex: 1, gap: 8 },
  problemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  problemText: { flex: 1, fontSize: 13, color: Colors.gray500, textDecorationLine: 'line-through' },
  solutionText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.foreground },

  // Features
  featureBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12 },
  featureBadgeText: { fontSize: 12, fontWeight: '600', color: WEEG_BLUE },
  featureSection: { marginBottom: 28 },
  featureSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  featureSectionIcon: { width: 40, height: 40, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  featureSectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: { width: (width - Spacing.base * 2 - 10) / 2, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, borderWidth: 1, borderColor: Colors.gray100 },
  featureIcon: { marginBottom: 8 },
  featureTitle: { fontSize: 13, fontWeight: '700', color: Colors.foreground, marginBottom: 4 },
  featureDesc: { fontSize: 11, color: Colors.gray500, lineHeight: 16 },

  // Roles
  roleTabs: { flexDirection: 'row', gap: 8, marginBottom: 20, justifyContent: 'center' },
  roleTabActive: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.lg },
  roleTabActiveText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  roleTabInactive: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.lg, backgroundColor: Colors.gray100 },
  roleTabInactiveText: { fontSize: 14, fontWeight: '600', color: Colors.gray600 },
  roleContent: { borderRadius: BorderRadius['2xl'], padding: 20, borderWidth: 2, borderColor: '#bfdbfe' },
  roleTitle: { fontSize: 22, fontWeight: '800', color: Colors.foreground, marginBottom: 4 },
  roleSubtitle: { fontSize: 14, color: Colors.gray500, marginBottom: 16 },
  roleBenefit: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.gray100 },
  roleBenefitText: { fontSize: 14, fontWeight: '500', color: Colors.foreground },

  // How it works
  howSection: { padding: Spacing.base, paddingVertical: 40 },
  howTitle: { fontSize: 28, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: 8 },
  howSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 32 },
  stepItem: { flexDirection: 'row', gap: 16, marginBottom: 24, alignItems: 'flex-start' },
  stepIcon: { width: 56, height: 56, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },

  // Demo section
  demoCard: { flexDirection: 'row', gap: 16, backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: 20, borderWidth: 1, borderColor: Colors.gray100 },
  demoLeft: { flex: 1 },
  demoTitle: { fontSize: 20, fontWeight: '800', color: Colors.foreground, marginBottom: 10 },
  demoDesc: { fontSize: 13, color: Colors.gray500, lineHeight: 20, marginBottom: 16 },
  demoButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.xl, alignSelf: 'flex-start' },
  demoButtonText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  demoRight: { width: 110, justifyContent: 'center', alignItems: 'center' },
  demoVideoThumb: { width: 110, height: 80, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },

  // FAQ
  faqItem: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.gray100, marginBottom: 10, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.foreground, marginRight: 10 },
  faqAnswer: { padding: 18, paddingTop: 0, fontSize: 14, color: Colors.gray500, lineHeight: 22 },

  footerBottomLink: { fontSize: 12, color: Colors.gray500 },
});