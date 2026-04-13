/**
 * AlarmTestScreen — PoC test screen for the GoFlo native alarm engine.
 *
 * NOT linked to main navigation. Add it temporarily for testing:
 *
 *   import AlarmTestScreen from './screens/AlarmTestScreen';
 *   <Stack.Screen name="AlarmTest" component={AlarmTestScreen} />
 *   navigation.navigate('AlarmTest');
 *
 * Expected logcat output (filter: GoFloAlarm):
 *   [AlarmScheduler]  Test alarm scheduled in 30s
 *   [AlarmFireReceiver] onReceive ...
 *   [AlarmFireReceiver] Wrote occurrence id=... status=pending
 *   [AlarmFireReceiver] Notification shown ...
 *   (after tapping Take in notification with app killed:)
 *   [AlarmActionReceiver] action=take ...
 *   [AlarmActionReceiver] occurrence=... status=taken
 *   [AlarmScheduler]  Alarm set for reminderId=... (next occurrence)
 */
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useState, useCallback } from 'react';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

type AlarmModule = typeof import('../../modules/GoFloAlarmModule/src');

// Static string literal so Metro can resolve the path at bundle time.
// The try/catch handles the case where the native module is not compiled
// into the running build (Expo Go, iOS, or web).
let alarmModule: AlarmModule | null = null;
if (Platform.OS === 'android') {
  try {
    alarmModule = require('../../modules/GoFloAlarmModule/src');
  } catch {
    alarmModule = null;
  }
}
const TEST_REMINDER_ID = 'poc-test-reminder-001';

type LogEntry = { time: string; msg: string; ok: boolean };

export default function AlarmTestScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((msg: string, ok = true) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, msg, ok }, ...prev]);
  }, []);

  function checkPermission() {
    if (!alarmModule) {
      addLog('Android only — not available on this platform', false);
      return;
    }
    const can = alarmModule.canScheduleExactAlarms();
    addLog(can ? 'SCHEDULE_EXACT_ALARM: GRANTED' : 'SCHEDULE_EXACT_ALARM: NOT GRANTED', can);
  }

  function openSettings() {
    if (!alarmModule) {
      addLog('Android only', false);
      return;
    }
    alarmModule.openExactAlarmSettings();
    addLog('Opened exact alarm settings screen');
  }

  function scheduleTest(delaySecs: number) {
    if (!alarmModule) {
      addLog('Android only — not available on this platform', false);
      return;
    }
    if (!alarmModule.canScheduleExactAlarms()) {
      addLog('Permission not granted — tap "Open Settings" first', false);
      return;
    }
    const result = alarmModule.scheduleTestAlarm(TEST_REMINDER_ID, delaySecs);
    addLog(
      result
        ? `Test alarm scheduled in ${delaySecs}s (id: ${TEST_REMINDER_ID})`
        : 'scheduleTestAlarm returned false',
      result,
    );
  }

  function cancelAlarm() {
    if (!alarmModule) {
      addLog('Android only', false);
      return;
    }
    alarmModule.cancelAlarm(TEST_REMINDER_ID);
    addLog(`Alarm cancelled for id: ${TEST_REMINDER_ID}`);
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      {Platform.OS !== 'android' && (
        <View style={[styles.banner, { backgroundColor: theme.warning + '33' }]}>
          <ThemedText style={styles.bannerText}>
            Native alarm engine is Android-only. This screen is a no-op on iOS and web.
          </ThemedText>
        </View>
      )}

      <ThemedText style={styles.heading}>Native Alarm Engine PoC</ThemedText>
      <ThemedText style={styles.sub}>
        Schedule a test alarm, fully kill the app, then tap Take on the notification.
        Check logcat with filter GoFloAlarm to confirm the full proof loop.
      </ThemedText>

      <View style={styles.grid}>
        <PocButton
          label="Check Permission"
          icon="shield"
          accent={theme.primary}
          bg={theme.backgroundSecondary}
          onPress={checkPermission}
        />
        <PocButton
          label="Open Settings"
          icon="settings"
          accent={theme.info}
          bg={theme.backgroundSecondary}
          onPress={openSettings}
        />
        <PocButton
          label="Alarm in 30s"
          icon="bell"
          accent={theme.success}
          bg={theme.backgroundSecondary}
          onPress={() => scheduleTest(30)}
        />
        <PocButton
          label="Alarm in 10s"
          icon="zap"
          accent={theme.warning}
          bg={theme.backgroundSecondary}
          onPress={() => scheduleTest(10)}
        />
        <PocButton
          label="Cancel Alarm"
          icon="x-circle"
          accent={theme.error}
          bg={theme.backgroundSecondary}
          onPress={cancelAlarm}
        />
      </View>

      <ThemedText style={styles.logHeading}>Log</ThemedText>
      {logs.length === 0 ? (
        <ThemedText style={[styles.emptyLog, { color: theme.textSecondary }]}>
          Tap a button to see output here.
        </ThemedText>
      ) : null}
      {logs.map((entry, i) => (
        <View
          key={i}
          style={[styles.logRow, { borderLeftColor: entry.ok ? theme.success : theme.error }]}
        >
          <ThemedText style={[styles.logTime, { color: theme.textSecondary }]}>
            {entry.time}
          </ThemedText>
          <ThemedText style={[styles.logMsg, { color: entry.ok ? theme.text : theme.error }]}>
            {entry.msg}
          </ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}

function PocButton({
  label,
  icon,
  accent,
  bg,
  onPress,
}: {
  label: string;
  icon: FeatherIconName;
  accent: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.button, { backgroundColor: bg, borderColor: accent + '55' }]}
      onPress={onPress}
      testID={`button-poc-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <Feather name={icon} size={18} color={accent} />
      <ThemedText style={[styles.buttonLabel, { color: accent }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  banner: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  bannerText: {
    fontSize: 13,
    textAlign: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xl,
    opacity: 0.7,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  logHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptyLog: {
    fontSize: 13,
  },
  logRow: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  logTime: {
    fontSize: 11,
  },
  logMsg: {
    fontSize: 13,
  },
});
