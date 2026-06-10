# GoFlo

## Overview

GoFlo is a cross-platform habit reminder app built with Expo/React Native and Express. The core feature is a triple-mode reminder system: **Cycle-based** (repeat on specific days within a cycle), **Interval-based** (repeat every X days), and **Weekday-based** (repeat on specific days of the week). The app uses a warm, earthy color palette with Playfair Display (headers) and Plus Jakarta Sans (body) fonts, aiming to reduce stress around task management.

### Branding Colors
- **Warm Linen** `#F5F0E8` — App background
- **Dark Bark** `#2C2118` — Primary text/font
- **Golden Hour** `#F0A020` — CTAs, highlights, active switches, links, tab bar active
- **Warm Stone** `#EDE7DA` — Cards/containers (secondary bg)
- **White** `#FFFFFF` — Regular cards
- **CTA Card** `#A4BCBC` — Card with CTA button (e.g., welcome/empty state)
- **Fired Terracotta** `#C03A2B` — Cycle type indicator, error states
- **Deep Emerald** `#2E7D52` — Calendar type indicator (follicular phase)
- **Saffron** `#C47D0A` — Warning states (ovulatory phase)
- **Warm Ocean** `#2A6E7A` — Info color (luteal phase)
- **Spring Fern** `#52B07A` — Success states

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo/React Native) — Local-First
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation v7 with bottom tabs and native stack navigators
- **Local Storage**: expo-sqlite for on-device reminder, history, and settings storage (`client/services/LocalDatabase.ts`)
- **State Management**: Custom React hooks wrapping LocalDatabase (`client/hooks/useLocalReminders.ts`), local React state for UI
- **Styling**: Custom theme system in `client/constants/theme.ts` with light/dark mode support
- **Animations**: React Native Reanimated for smooth micro-interactions
- **Path Aliases**: `@/` maps to `client/`, `@shared/` maps to `shared/`
- **Web Fallback**: SQLite is loaded via `require()` (not top-level import) to avoid crashes on web. All LocalDatabase methods return empty/null on web.

### Backend (Express) — Minimal
- **Server**: Express 5 with TypeScript running on port 5000
- **Role**: Serves static Expo bundles and landing page only. Reminder data is stored locally on-device.
- **Database**: PostgreSQL with Drizzle ORM (used only for user/subscription data, not reminders)
- **Schema Location**: `shared/schema.ts` (legacy server schema, not used by client screens)

### CRITICAL: Static Bundle Deployment
- **Mobile Expo Go** loads pre-built static JS bundles from `static-build/` folder, NOT the live Metro dev server
- **After ANY code change**, you MUST run `node scripts/build.js` to rebuild the static bundles, then restart the backend (`Start Backend` workflow) so mobile devices pick up the changes
- The Metro dev server (`Start Frontend`) only serves the web version; mobile gets served from the backend's static files
- **Dev web preview port**: Expo runs on localPort **8081** (mapped to external port 80 = the port-less primary domain `https://$REPLIT_DEV_DOMAIN`). This MUST match `EXPO_PACKAGER_PROXY_URL=https://$REPLIT_DEV_DOMAIN` (no port) set in the `expo:dev` script — otherwise the in-IDE "Mobile App" preview connects to a dead address and shows blank. The `--port 8081` flag is set in the `Start Frontend` workflow command.
- Build version: v1.0.13

### Local-First Data Flow
- **Reminders**: Created, read, updated, deleted via `LocalDatabase` (SQLite) — no server API calls
- **History**: Notification actions (take/skip/snooze) write history entries to local SQLite; missed reminders auto-detected on app launch
- **Notifications**: Scheduled locally via expo-notifications; `syncAllNotifications()` runs on app startup to reschedule and detect missed reminders
- **Background Task**: `expo-task-manager` handles Take/Skip/Snooze actions in background without opening app (headless JS)
- **Re-prompts**: 1 hour after a notification with no action, one follow-up is sent (today's reminders only); cancelled if user acts
- **IDs**: UUID strings (generated client-side), not auto-increment numbers
- **Next Occurrence**: Calculated client-side in `LocalDatabase.ts` when creating/updating reminders

### Project Structure
```
client/           # React Native app code
  components/     # Reusable UI components
  screens/        # Screen components
  navigation/     # Navigation configuration
  hooks/          # Custom React hooks (useLocalReminders, useLocalReminder, useLocalHistory)
  services/       # LocalDatabase.ts (SQLite), notifications.ts, AlarmService.ts
  lib/            # Utilities (query client kept for legacy compatibility)
  constants/      # Theme, design tokens, and copy.ts
server/           # Express backend (serves static files + push notification API)
  routes.ts       # API endpoints: POST /api/push-token, POST /api/cycle-configs/sync
  storage.ts      # Database operations
  db.ts           # Drizzle/PostgreSQL connection
  utils/
    pushScheduler.ts   # Server-side push notification scheduler (runs every 60s)
    cycleCalculator.ts # Cycle day calculation logic
shared/           # Code shared between client and server
  schema.ts       # Drizzle schema (users, push_tokens, cycle_reminder_configs)
```

### Onboarding & User Personalization
- **Onboarding**: 2-page flow shown on first launch (stored via AsyncStorage `@goflo/onboarding_complete`)
- **User Name**: Captured on onboarding page 2, stored in AsyncStorage `@goflo/user_name`
- **Greeting**: HomeScreen shows "Good morning/afternoon/evening, [Name]" based on time of day
- **Hook**: `client/hooks/useUserName.ts` provides `{ name, setName, isLoading }`

### Key Design Decisions
- **High-Priority Notifications**: All reminder notifications use iOS Time-Sensitive interruption level and Android IMPORTANCE_HIGH channel ("reminders") for immediate visibility; buffer warnings remain default priority
- **Hybrid Notification Architecture**: Cycle reminders use server-side Expo Push API (via pushScheduler) for indefinite delivery without app interaction; calendar reminders remain 100% local
- **Local-First Architecture**: All reminder data stored on-device via expo-sqlite for instant access and offline support
- **5-Day Local Buffer**: Cycle reminders also schedule 5 days of local notifications as an offline safety net, with a warning notification 1 day before the buffer runs out
- **Push Sync**: `client/services/pushSync.ts` handles push token registration and cycle config syncing to server on app launch and on create/edit/delete
- **Unified Form**: Single `CreateReminderScreen` with 3 frequency modes (Cycle/Interval/Weekdays) replacing old TypeSelector + separate forms
- **Reminder Types**: Three frequency modes (cycle, interval, weekdays) stored in single SQLite table with conditional fields; interval/weekdays map to `reminderType: "calendar"` with different `repeatUnit` values
- **Typography**: Playfair Display Bold for all headers/section titles; Plus Jakarta Sans (Regular/Medium/SemiBold/Bold) for all body text; defined in `FontFamily` constants in `theme.ts`
- **Form Design Colors**: `#E8614F` coral (active pill border, filled icons, save button), `#F9E8E4` pill active bg, `#E8C4B8` save disabled, `#6B5744` empty icon/tertiary text color
- **Component Pattern**: Themed components (`ThemedText`, `ThemedView`) that automatically adapt to color scheme
- **Centralized Copy**: All user-facing text is managed through `client/constants/copy.ts` for easy maintenance and future i18n support
- **Sound System**: Excluded from current sprint; `soundEnabled` defaults to `false`; notification sound row hidden from reminder creation form
- **Dark Mode**: Full dark mode support across all screens — all colors use `theme.*` references from `useTheme()` hook; no hardcoded light-mode colors remain (except AnimatedSplashScreen which uses intentional coral branding colors)
- **Interval Unit**: Interval frequency only supports "Day" unit (no "Week" option); unit label is non-interactive

### Copy File Guidelines
- **Location**: `client/constants/copy.ts`
- **Structure**: Organized by screen/feature with nested objects (e.g., `Copy.home.welcomeTitle`, `Copy.profile.saveChanges`)
- **Dynamic Text**: Use functions for parameterized strings (e.g., `Copy.home.checkHistoryText(count)`)
- **IMPORTANT**: All new user-facing text MUST be added to the copy file first, then referenced in components
- **Categories**: `common` (shared), `navigation`, `home`, `createReminder`, `soundSettings`, `remindersScreen`, `reminderDetail`, `history`, `more`, `profile`, `snoozeSettings`, `alarmSounds`, `emptyState`, `paywall`, `errors`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema in `shared/schema.ts`

### Core Services
- **Expo Notifications**: Push notification scheduling for reminders
- **Expo Haptics**: Tactile feedback on interactions
- **RevenueCat (react-native-purchases)**: In-app subscription management for iOS App Store and Google Play
- **Firebase Analytics** (`@react-native-firebase/analytics`): Event tracking and screen view logging
- **Firebase Crashlytics** (`@react-native-firebase/crashlytics`): Automatic crash reporting and custom error logging
  - Firebase config: `google-services.json` (Android) at project root
  - Firebase project: `cycleaware-14ab8`
  - Service file: `client/services/firebase.ts` — provides `initFirebase()`, `logAnalyticsEvent()`, `logScreenView()`, `recordError()`, `logCrashlyticsMessage()`
  - Initialized in `client/App.tsx` on app launch
  - Only active in EAS builds (native), skipped on web platform

### Subscriptions & Payments
- **Provider**: RevenueCat via `react-native-purchases` SDK
- **Plans**: Monthly and Yearly subscriptions
- **Entitlement ID**: `"pro"` — used to check if user has active subscription
- **API Key**: Stored as `EXPO_PUBLIC_REVENUECAT_API_KEY` environment secret
- **Files**:
  - `client/services/subscriptionService.ts` — RevenueCat SDK initialization, purchase/restore/status functions
  - `client/contexts/SubscriptionContext.tsx` — React Context providing `useSubscription()` hook app-wide
  - `client/screens/PaywallScreen.tsx` — Paywall UI with plan selection, purchase, and restore
- **Integration Points**: ProfileScreen "View Plans" button, MoreScreen subscription card both navigate to Paywall
- **Web Behavior**: RevenueCat works in Expo Go preview mode; on web, paywall shows a "use Expo Go" message
- **RevenueCat Dashboard Setup Required**: Create products (monthly/yearly), an entitlement named "pro", and an offering with both packages

### Development
- **TanStack React Query**: API data fetching and caching
- **Zod**: Runtime validation (via drizzle-zod integration)
- **bcryptjs**: Password hashing for user authentication