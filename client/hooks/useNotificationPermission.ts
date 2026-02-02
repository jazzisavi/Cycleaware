import { useCallback, useEffect, useState } from "react";
import { Platform, Linking } from "react-native";
import Constants from "expo-constants";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export type PermissionStatus = "granted" | "denied" | "undetermined" | "unavailable";

export function useNotificationPermission() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("undetermined");
  const [notificationsAvailable, setNotificationsAvailable] = useState(false);

  const checkPermissionStatus = useCallback(async () => {
    if (Platform.OS === "web") {
      setNotificationsAvailable(false);
      setPermissionStatus("unavailable");
      return "unavailable" as PermissionStatus;
    }
    if (Platform.OS === "android" && isExpoGo()) {
      setNotificationsAvailable(false);
      setPermissionStatus("unavailable");
      return "unavailable" as PermissionStatus;
    }
    
    setNotificationsAvailable(true);
    
    try {
      const Notifications = await import("expo-notifications");
      const { status } = await Notifications.getPermissionsAsync();
      const mappedStatus = status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
      setPermissionStatus(mappedStatus);
      return mappedStatus;
    } catch (error) {
      console.log("Error checking notification permission:", error);
      setPermissionStatus("unavailable");
      return "unavailable" as PermissionStatus;
    }
  }, []);

  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (Platform.OS === "web") {
      return "unavailable";
    }

    if (Platform.OS === "android" && isExpoGo()) {
      return "unavailable";
    }

    try {
      const Notifications = await import("expo-notifications");

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === "granted") {
        setPermissionStatus("granted");
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        return "granted";
      }

      const { status } = await Notifications.requestPermissionsAsync();
      const mappedStatus = status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
      setPermissionStatus(mappedStatus);
      
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
      
      return mappedStatus;
    } catch (error) {
      console.log("Notifications not available:", error);
      setPermissionStatus("unavailable");
      return "unavailable";
    }
  }, []);

  const openSettings = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    
    try {
      await Linking.openSettings();
    } catch (error) {
      console.log("Could not open settings:", error);
    }
  }, []);

  return { 
    permissionStatus, 
    notificationsAvailable, 
    requestPermission, 
    openSettings,
    checkPermissionStatus,
  };
}
