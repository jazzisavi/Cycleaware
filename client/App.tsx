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
import { 
  setupNotificationCategories, 
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
  handleNotificationAction,
  checkLastNotificationResponse,
  syncAllNotifications,
} from "@/services/notifications";

const actionHandler = async (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string) => {
  await handleNotificationAction(actionId, reminderId, reminderTitle, soundEnabled, notificationId);
};

export default function App() {
  useEffect(() => {
    LocalDatabase.initDatabase();

    setupNotificationCategories();
    
    let responseCleanup: (() => void) | null = null;
    let receivedCleanup: (() => void) | null = null;
    
    const setupListeners = async () => {
      receivedCleanup = await setupNotificationReceivedListener();
      
      responseCleanup = await setupNotificationResponseListener(actionHandler);

      await checkLastNotificationResponse(actionHandler);

      await syncAllNotifications();
    };
    
    setupListeners();
    
    return () => {
      if (responseCleanup) responseCleanup();
      if (receivedCleanup) receivedCleanup();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <NavigationContainer>
              <RootStackNavigator />
            </NavigationContainer>
            <StatusBar style="auto" />
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
