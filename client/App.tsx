import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import AnimatedSplashScreen from "@/screens/AnimatedSplashScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocalDatabase } from "@/services/LocalDatabase";
import { ActionConfirmationProvider, useActionConfirmation } from "@/contexts/ActionConfirmationContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ActionConfirmationToast } from "@/components/ActionConfirmationToast";
import { 
  setupNotificationCategories, 
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
  handleNotificationAction,
  checkLastNotificationResponse,
  syncAllNotifications,
} from "@/services/notifications";
import { readBackgroundTaskLog } from "@/services/notificationBackgroundTask";
import { onAppLaunchSync } from "@/services/pushSync";
import { initFirebase } from "@/services/firebase";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { state, showConfirmation, dismiss } = useActionConfirmation();

  useEffect(() => {
    LocalDatabase.initDatabase();
    setupNotificationCategories();

    let responseCleanup: (() => void) | null = null;
    let receivedCleanup: (() => void) | null = null;

    const actionHandler = async (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string, scheduledTime?: string) => {
      const result = await handleNotificationAction(actionId, reminderId, reminderTitle, soundEnabled, notificationId, scheduledTime);
      if (!result.success) {
        throw new Error(result.message || "Action failed");
      }
      if (result.message) {
        if (result.message === "taken") {
          showConfirmation("taken");
        } else if (result.message === "skipped") {
          showConfirmation("skipped");
        } else if (result.message.startsWith("snoozed:")) {
          const mins = parseInt(result.message.split(":")[1], 10);
          const durationText = mins >= 60 ? `${mins / 60} hour${mins > 60 ? "s" : ""}` : `${mins} mins`;
          showConfirmation("snoozed", durationText);
        }
      }
    };
    
    const setupListeners = async () => {
      receivedCleanup = await setupNotificationReceivedListener();
      responseCleanup = await setupNotificationResponseListener(actionHandler);
      await checkLastNotificationResponse(actionHandler);
      await syncAllNotifications();
      onAppLaunchSync();
      initFirebase();

      const bgTaskLog = await readBackgroundTaskLog();
      if (bgTaskLog.length > 0) {
        console.log("[BG_TASK_DIAGNOSTIC] Background task log entries found on launch:");
        bgTaskLog.forEach((entry) => console.log("[BG_TASK_DIAGNOSTIC]", entry));
      } else {
        console.log("[BG_TASK_DIAGNOSTIC] No background task log entries found on launch.");
      }
    };
    
    setupListeners();
    
    return () => {
      if (responseCleanup) responseCleanup();
      if (receivedCleanup) receivedCleanup();
    };
  }, []);

  return (
    <>
      <NavigationContainer>
        <RootStackNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
      <ActionConfirmationToast
        actionType={state.actionType}
        snoozeDuration={state.snoozeDuration}
        onDismiss={dismiss}
      />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (showAnimatedSplash) {
    return (
      <ErrorBoundary>
        <AnimatedSplashScreen onFinish={() => setShowAnimatedSplash(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <SubscriptionProvider>
              <ActionConfirmationProvider>
                <AppContent />
              </ActionConfirmationProvider>
            </SubscriptionProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
