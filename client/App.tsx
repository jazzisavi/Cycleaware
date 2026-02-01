import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
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
  handleNotificationAction 
} from "@/services/notifications";

export default function App() {
  useEffect(() => {
    setupNotificationCategories();
    
    let cleanup: (() => void) | null = null;
    
    const setupListener = async () => {
      cleanup = await setupNotificationResponseListener(
        async (actionId, reminderId, reminderTitle) => {
          const result = await handleNotificationAction(actionId, reminderId, reminderTitle);
          if (result.success && result.message) {
            console.log(result.message);
          }
        }
      );
    };
    
    setupListener();
    
    return () => {
      if (cleanup) cleanup();
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
