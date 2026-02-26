import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocalDatabase } from "@/services/LocalDatabase";
import { ActionConfirmationProvider, useActionConfirmation } from "@/contexts/ActionConfirmationContext";
import { ActionConfirmationToast } from "@/components/ActionConfirmationToast";
import { 
  setupNotificationCategories, 
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
  handleNotificationAction,
  checkLastNotificationResponse,
  syncAllNotifications,
} from "@/services/notifications";
import { registerBackgroundNotificationTask } from "@/services/backgroundNotificationTask";
import { onAppLaunchSync } from "@/services/pushSync";

function AppContent() {
  const { state, showConfirmation, dismiss } = useActionConfirmation();

  useEffect(() => {
    LocalDatabase.initDatabase();
    setupNotificationCategories();
    registerBackgroundNotificationTask();
    
    let responseCleanup: (() => void) | null = null;
    let receivedCleanup: (() => void) | null = null;

    const actionHandler = async (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string) => {
      const result = await handleNotificationAction(actionId, reminderId, reminderTitle, soundEnabled, notificationId);
      if (result.success && result.message) {
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
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <ActionConfirmationProvider>
              <AppContent />
            </ActionConfirmationProvider>
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
