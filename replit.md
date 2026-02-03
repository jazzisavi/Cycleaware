# GoFlo

## Overview

GoFlo is a cross-platform habit reminder app built with Expo/React Native and Express. The core feature is a dual-mode reminder system: **Cycle-based** (repeat every X days) and **Calendar-based** (specific weekdays or dates). The app follows a soft pastel design aesthetic with editorial precision, aiming to reduce stress around task management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo/React Native)
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation v7 with bottom tabs and native stack navigators
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Custom theme system in `client/constants/theme.ts` with light/dark mode support
- **Animations**: React Native Reanimated for smooth micro-interactions
- **Path Aliases**: `@/` maps to `client/`, `@shared/` maps to `shared/`

### Backend (Express)
- **Server**: Express 5 with TypeScript running on port 5000
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Storage Pattern**: Repository pattern via `server/storage.ts` abstracting database operations

### Project Structure
```
client/           # React Native app code
  components/     # Reusable UI components
  screens/        # Screen components
  navigation/     # Navigation configuration
  hooks/          # Custom React hooks
  lib/            # Utilities (query client, API helpers)
  constants/      # Theme and design tokens
server/           # Express backend
  routes.ts       # API endpoints
  storage.ts      # Database operations
  db.ts           # Drizzle/PostgreSQL connection
shared/           # Code shared between client and server
  schema.ts       # Drizzle schema and Zod validators
```

### Key Design Decisions
- **Monorepo Structure**: Client and server in single repo with shared schema for type safety
- **Demo Auth**: Simplified session-based auth with demo user for development
- **Reminder Types**: Two distinct reminder modes (cycle and calendar) stored in single table with conditional fields
- **Component Pattern**: Themed components (`ThemedText`, `ThemedView`) that automatically adapt to color scheme
- **Centralized Copy**: All user-facing text is managed through `client/constants/copy.ts` for easy maintenance and future i18n support

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