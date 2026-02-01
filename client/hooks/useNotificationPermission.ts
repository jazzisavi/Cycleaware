import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const PERMISSION_REQUESTED_KEY = "@goflo/notification_permission_requested";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export function useNotificationPermission() {
  const [notificationsAvailable, setNotificationsAvailable] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS === "web") {
        setNotificationsAvailable(false);
        return;
      }
      if (Platform.OS === "android" && isExpoGo()) {
        setNotificationsAvailable(false);
        return;
      }
      setNotificationsAvailable(true);
    };
    checkAvailability();
  }, []);

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

      if (Platform.OS === "android" && isExpoGo()) {
        await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, "true");
        return;
      }

      const Notifications = await import("expo-notifications");

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
      console.log("Notifications not available:", error);
      await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, "true");
    }
  }, []);

  return { requestPermissionIfNeeded, notificationsAvailable };
}
