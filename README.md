# WEEG Mobile 📱

Application mobile **React Native (Expo)** — identique au front web en termes de design, couleurs, textes et fonctionnalités.

## 🎨 Design System (100% fidèle au web)

| Token | Web | Mobile |
|-------|-----|--------|
| Primary | `#4f46e5` (indigo-600) | `Colors.indigo600` |
| Gradient | `from-indigo-600 to-violet-600` | `LinearGradient([indigo600, violet600])` |
| Background | `bg-fafafa` | `Colors.background` |
| Card | `rounded-2xl shadow-xl` | `BorderRadius['2xl'] + Shadow.md` |
| Typography | Inter | System default |

## 📁 Structure

```
weeg-mobile/
├── App.tsx                         # Entry point
├── src/app/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LandingScreen.tsx   ← mirrors LandingPage.tsx
│   │   │   ├── LoginScreen.tsx     ← mirrors LoginPage.tsx
│   │   │   └── SignupScreen.tsx    ← mirrors SignupPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx ← mirrors DashboardPage.tsx
│   │   ├── sales/
│   │   │   └── SalesScreen.tsx     ← mirrors SalesPage.tsx
│   │   ├── inventory/
│   │   │   └── InventoryScreen.tsx ← mirrors InventoryPage.tsx
│   │   ├── alerts/
│   │   │   └── AlertsScreen.tsx    ← mirrors AlertsPage.tsx
│   │   ├── kpi/
│   │   │   └── KPIEngineScreen.tsx ← mirrors KPIEnginePage.tsx
│   │   ├── ai-insights/
│   │   │   └── AIInsightsScreen.tsx ← mirrors AIInsightsPage.tsx
│   │   ├── aging/
│   │   │   └── AgingScreen.tsx     ← mirrors AgingPage.tsx
│   │   └── settings/
│   │       └── SettingsScreen.tsx  ← mirrors SettingsPage.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Auth guard + root stack
│   │   └── MainNavigator.tsx       # Tabs + Drawer (mirrors Sidebar/Header)
│   ├── contexts/
│   │   └── AuthContext.tsx         # Identical logic to web
│   ├── lib/
│   │   └── mockData.ts             # Same mock data as web
│   └── constants/
│       └── theme.ts                # All colors, spacing, shadows
```

## 🚀 Installation

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android
```

## 📱 Navigation

- **Bottom Tab Bar** — Dashboard, Sales, Inventory, Alerts, AI Insights
- **Drawer (Hamburger)** — Full menu with KPI Engine, Aging, Settings
- **Header** — Notification bell, menu button
- **Auth Flow** — Landing → Login → Signup → Main App

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fasi.com | admin123 |
| Manager | john@company.com | manager123 |
| Agent | sarah@company.com | agent123 |

## 🎯 Features Implemented

- ✅ Landing Page avec hero, problem/solutions, features, roles, how it works, FAQ, footer
- ✅ Login + Signup avec validation
- ✅ Dashboard avec KPIs, graphiques, transactions récentes, branches
- ✅ Sales & Purchases avec filtres et résumé
- ✅ Inventory multi-branche avec barres de stock
- ✅ Smart Alerts avec sévérité, IA explanation, résolution
- ✅ KPI Engine avec formules et détails
- ✅ AI Insights avec chat interactif et prédictions
- ✅ Aging Receivables avec statuts et progression
- ✅ Settings avec toggles et profil utilisateur

## 🎨 Correspondance Web → Mobile

| Web (Tailwind) | Mobile (StyleSheet) |
|---------------|---------------------|
| `bg-gradient-to-r from-indigo-600 to-violet-600` | `LinearGradient([Colors.indigo600, Colors.violet600])` |
| `rounded-2xl` | `borderRadius: BorderRadius['2xl']` (20) |
| `shadow-xl` | `Shadow.xl` |
| `text-indigo-600` | `color: Colors.indigo600` |
| `bg-gray-50` | `backgroundColor: Colors.gray50` |
| `border border-gray-200` | `borderWidth: 1, borderColor: Colors.gray200` |
