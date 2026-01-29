# GoFlo Design Guidelines

## 1. Brand Identity

**Purpose**: GoFlo helps users build consistent habits through flexible reminder scheduling, whether cycling every X days or anchoring to specific calendar dates.

**Aesthetic Direction**: **Soft/Pastel with Editorial Precision**
- Gentle, calming interface that doesn't add stress to task management
- Clean typographic hierarchy inspired by productivity journals
- Breathing room around elements for mental clarity
- Subtle pastel accents that feel approachable, not childish

**Memorable Element**: The distinctive dual-mode reminder system (Cycle vs Calendar) visualized through intuitive iconography and color coding.

## 2. Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs) with Floating Action Button for core "Create" action

**Tab Structure**:
1. **Home** - Quick overview and upcoming reminders
2. **Reminders** - Full list of active reminders
3. **More** - Settings, history, subscription
4. **Profile** - User account and preferences

**Floating Action Button**: Centered "+ Create" button overlaying tab bar, opens reminder type selector modal.

## 3. Screen-by-Screen Specifications

### Home Screen
- **Purpose**: At-a-glance view of today's reminders and quick access to create
- **Header**: Transparent, title "GoFlo", no navigation buttons
- **Layout**: Scrollable
  - Welcome message with user name
  - "Today's Reminders" card section
  - "Upcoming" section (next 3 days)
- **Safe Area**: Top: headerHeight + 24px, Bottom: tabBarHeight + 80px (accounts for FAB)
- **Empty State**: Show illustration with "No reminders today" message

### Reminders List Screen
- **Purpose**: View and manage all active reminders
- **Header**: Transparent, title "Reminders", right button: filter icon
- **Layout**: FlatList
  - Each reminder card shows: title, next occurrence, repeat pattern icon, countdown
  - Swipe actions: Complete (left), Edit (right)
- **Safe Area**: Top: headerHeight + 16px, Bottom: tabBarHeight + 24px
- **Empty State**: Illustration with "Create your first reminder"

### Create Reminder Modal (Sheets/Modals)
- **Type Selector Modal**: Full-screen modal presenting two large cards:
  - "Cycle-Based" (repeat every X days icon)
  - "Calendar-Based" (specific dates icon)
- **Reminder Form**: Stack navigation after type selection
  - Header: Opaque white background, left: Cancel, right: Save
  - Form fields: Title (required), Notes, Time picker, Repeat configuration
  - Submit/Cancel: In header
  - Safe Area: Top: 16px, Bottom: insets.bottom + 24px

### Repeat Configuration (Cycle-Based)
- **Purpose**: Set interval days and repeating pattern
- **Header**: Opaque, left: Back, title "Repeat Every", right: Done
- **Layout**: Scrollable form
  - Number picker for days (1-365)
  - Calendar picker for selecting repeat days
  - Toggle: "Repeat on specific days" vs "Every X days only"
- **Safe Area**: Top: 16px, Bottom: insets.bottom + 24px

### Repeat Configuration (Calendar-Based)
- **Purpose**: Select specific dates from calendar
- **Header**: Opaque, left: Back, title "Select Dates", right: Done
- **Layout**: Scrollable
  - Large calendar component with multi-select
  - Selected dates list below calendar
- **Safe Area**: Top: 16px, Bottom: insets.bottom + 24px

### History Screen (under More)
- **Purpose**: Review past notification interactions
- **Header**: Default navigation, title "History", left: Back
- **Layout**: FlatList with sections by date
  - Status badges: Completed (green), Snoozed (orange), Missed (gray)
  - Each item: reminder title, time, status
- **Safe Area**: Top: 16px, Bottom: tabBarHeight + 24px
- **Empty State**: "No history yet" illustration

### Snooze Settings Screen (under More)
- **Purpose**: Customize default snooze duration
- **Header**: Default navigation, title "Snooze Settings", left: Back
- **Layout**: Scrollable form
  - Picker component: 10, 20, 30, 40, 50, 60, 90, 120 minutes
  - Description text explaining snooze behavior
- **Safe Area**: Top: 16px, Bottom: insets.bottom + 24px

### Alarm Sounds Screen (under More)
- **Purpose**: Select notification sound
- **Header**: Default navigation, title "Alarm Sound", left: Back
- **Layout**: FlatList
  - Device system sounds listed
  - Play button next to each sound
  - Checkmark on selected sound
- **Safe Area**: Top: 16px, Bottom: insets.bottom + 24px

### More Menu Screen
- **Purpose**: Access secondary features and settings
- **Header**: Transparent, title "More"
- **Layout**: Scrollable
  - Settings sections: History, Snooze Settings, Alarm Sounds
  - Account section: Subscription status, Email, Sign out
- **Safe Area**: Top: headerHeight + 24px, Bottom: tabBarHeight + 24px

### Profile Screen
- **Purpose**: Manage account and preferences
- **Header**: Transparent, title "Profile"
- **Layout**: Scrollable
  - Avatar and display name
  - Email address (captured during onboarding)
  - Subscription status badge
  - App preferences
- **Safe Area**: Top: headerHeight + 24px, Bottom: tabBarHeight + 24px

## 4. Color Palette

**Primary**: #6B9BD1 (Soft blue - calm and trustworthy)
**Secondary**: #B4CFE0 (Light blue - for backgrounds)
**Accent**: #F4A261 (Warm coral - for CTAs and cycle-based reminders)
**Accent 2**: #A8DADC (Mint - for calendar-based reminders)

**Backgrounds**:
- Primary BG: #FAFBFC (Off-white with slight blue tint)
- Surface: #FFFFFF (Cards, modals)
- Surface Elevated: #FFFFFF with shadow

**Text**:
- Primary: #2D3748 (Near black, readable)
- Secondary: #718096 (Gray for metadata)
- Tertiary: #A0AEC0 (Light gray for placeholders)

**Semantic**:
- Success: #48BB78 (Green - completed)
- Warning: #ED8936 (Orange - snoozed)
- Error: #F56565 (Red - missed/delete)
- Info: #4299E1 (Blue)

## 5. Typography

**Font**: Inter (Google Font) for entire app - clean, legible, professional

**Type Scale**:
- Display: 32px, Bold (Welcome messages)
- H1: 24px, Bold (Screen titles)
- H2: 20px, Semibold (Section headers)
- H3: 18px, Semibold (Card titles)
- Body: 16px, Regular (Main content)
- Body Small: 14px, Regular (Metadata, descriptions)
- Caption: 12px, Regular (Labels, helper text)
- Button: 16px, Semibold (All CTAs)

## 6. Assets to Generate

**App Icon** (icon.png)
- Circular badge with "GF" monogram on soft blue gradient background
- Used: Device home screen

**Splash Icon** (splash-icon.png)
- Same as app icon, centered on brand background color
- Used: App launch screen

**Empty States**:
- **empty-reminders.png**: Minimalist illustration of a peaceful calendar with check marks, soft pastel colors
  - Used: Reminders list when empty
- **empty-today.png**: Sun icon with "all clear" subtle illustration
  - Used: Home screen when no reminders today
- **empty-history.png**: Clock with circular arrows in soft gray/blue
  - Used: History screen when empty

**Type Icons** (illustrations, not icon font):
- **cycle-icon.png**: Circular arrows representing repeating cycle, coral accent color
  - Used: Type selector modal, cycle-based reminder cards
- **calendar-icon.png**: Calendar page with specific dates highlighted, mint accent color
  - Used: Type selector modal, calendar-based reminder cards

**User Avatar**:
- **default-avatar.png**: Simple circular gradient (blue to mint) with subtle pattern
  - Used: Profile screen default avatar