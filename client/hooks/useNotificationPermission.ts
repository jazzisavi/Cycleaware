import { useCallback } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const PERMISSION_REQUESTED_KEY = "@goflo/notification_permission_requested";

export function useNotificationPermission() {
  const requestPermissionIfNeeded = useCallback(async () => {
    try {
      const hasRequested = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
      if (hasRequested === "true") {
        return;
      }

      if (Platform.OS === "web") {
        await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, "true");
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === "granted") {
        await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, "true");
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, "true");
      
      if (status === "granted") {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      }
    } catch (error) {
      console.log("Error requesting notification permission:", error);
    }
  }, []);

  return { requestPermissionIfNeeded };
}
