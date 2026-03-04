import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import CreateReminderScreen from "@/screens/CreateReminderScreen";
import ReminderDetailScreen from "@/screens/ReminderDetailScreen";
import MoreScreen from "@/screens/MoreScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import SnoozeSettingsScreen from "@/screens/SnoozeSettingsScreen";
import AlarmSoundsScreen from "@/screens/AlarmSoundsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

const ONBOARDING_KEY = "@goflo/onboarding_complete";

export type RootStackParamList = {
  Main: { screen?: "Home" | "Reminders" } | undefined;
  CreateReminder: {
    reminderId?: string;
  } | undefined;
  ReminderDetail: { reminderId: string };
  More: undefined;
  History: undefined;
  SnoozeSettings: undefined;
  AlarmSounds: undefined;
  Profile: undefined;
  Paywall: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });
  const { theme } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => setShowOnboarding(value !== "true"))
      .catch(() => setShowOnboarding(false));
  }, []);

  if (showOnboarding === null) return null;

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="ReminderDetail"
        component={ReminderDetailScreen}
        options={({ navigation }) => ({
          headerTitle: "Reminder Details",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="More"
        component={MoreScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          headerTitle: "More",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          headerTitle: "History",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="SnoozeSettings"
        component={SnoozeSettingsScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          headerTitle: "Snooze Settings",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="AlarmSounds"
        component={AlarmSoundsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          headerTitle: "Profile",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          headerTitle: "",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
    </Stack.Navigator>
  );
}
