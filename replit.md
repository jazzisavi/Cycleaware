# GoFlo

## Overview

GoFlo is a cross-platform habit reminder app built with Expo/React Native and Express. The core feature is a dual-mode reminder system: **Cycle-based** (repeat every X days) and **Calendar-based** (specific weekdays or dates). The app follows a soft pastel design aesthetic with editorial precision, aiming to reduce stress around task management.

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

### Local-First Data Flow
- **Reminders**: Created, read, updated, deleted via `LocalDatabase` (SQLite) — no server API calls
- **History**: Notification actions (take/skip/snooze) write history entries to local SQLite
- **Notifications**: Scheduled locally via expo-notifications; `syncAllNotifications()` runs on app startup to reschedule
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
server/           # Express backend (minimal — serves static files)
  routes.ts       # API endpoints (legacy, not used by reminder screens)
  storage.ts      # Database operations (legacy)
  db.ts           # Drizzle/PostgreSQL connection
shared/           # Code shared between client and server
  schema.ts       # Drizzle schema (legacy server schema)
```

### Key Design Decisions
- **Local-First Architecture**: All reminder data stored on-device via expo-sqlite for instant access and offline support
- **Reminder Types**: Two distinct reminder modes (cycle and calendar) stored in single SQLite table with conditional fields
- **Component Pattern**: Themed components (`ThemedText`, `ThemedView`) that automatically adapt to color scheme
- **Centralized Copy**: All user-facing text is managed through `client/constants/copy.ts` for easy maintenance and future i18n support
- **Sound System**: Excluded from current sprint; `soundEnabled` defaults to `false`

### Copy File Guidelines
- **Location**: `client/constants/copy.ts`
- **Structure**: Organized by screen/feature with nested objects (e.g., `Copy.home.welcomeTitle`, `Copy.profile.saveChanges`)
- **Dynamic Text**: Use functions for parameterized strings (e.g., `Copy.home.checkHistoryText(count)`)
- **IMPORTANT**: All new user-facing text MUST be added to the copy file first, then referenced in components
- **Categories**: `common` (shared), `navigation`, `home`, `typeSelector`, `createCycleReminder`, `createCalendarReminder`, `soundSettings`, `repeatingDays`, `repeatFrequency`, `remindersScreen`, `reminderDetail`, `history`, `more`, `profile`, `snoozeSettings`, `alarmSounds`, `emptyState`, `errors`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema in `shared/schema.ts`

### Core Services
- **Expo Notifications**: Push notification scheduling for reminders
- **Expo Haptics**: Tactile feedback on interactions

### Development
- **TanStack React Query**: API data fetching and caching
- **Zod**: Runtime validation (via drizzle-zod integration)
- **bcryptjs**: Password hashing for user authentication