import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { 
  setupNotificationCategories, 
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
  handleNotificationAction,
  checkLastNotificationResponse,
} from "@/services/notifications";

const actionHandler = async (actionId: string, reminderId: string, reminderTitle: string, soundEnabled: boolean, notificationId?: string) => {
  const result = await handleNotificationAction(actionId, reminderId, reminderTitle, soundEnabled, notificationId);
  if (result.success) {
    queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notification-history"] });
  }
};

export default function App() {
  useEffect(() => {
    setupNotificationCategories();
    
    let responseCleanup: (() => void) | null = null;
    let receivedCleanup: (() => void) | null = null;
    
    const setupListeners = async () => {
      receivedCleanup = await setupNotificationReceivedListener();
      
      responseCleanup = await setupNotificationResponseListener(actionHandler);

      await checkLastNotificationResponse(actionHandler);
    };
    
    setupListeners();
    
    return () => {
      if (responseCleanup) responseCleanup();
      if (receivedCleanup) receivedCleanup();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
