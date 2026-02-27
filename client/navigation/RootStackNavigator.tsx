import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import TypeSelectorScreen from "@/screens/TypeSelectorScreen";
import CreateReminderScreen from "@/screens/CreateReminderScreen";
import CreateCalendarReminderScreen from "@/screens/CreateCalendarReminderScreen";
import ReminderDetailScreen from "@/screens/ReminderDetailScreen";
import MoreScreen from "@/screens/MoreScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import SnoozeSettingsScreen from "@/screens/SnoozeSettingsScreen";
import AlarmSoundsScreen from "@/screens/AlarmSoundsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import RepeatingDaysScreen from "@/screens/RepeatingDaysScreen";
import RepeatFrequencyScreen from "@/screens/RepeatFrequencyScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Main: { screen?: "Home" | "Reminders" } | undefined;
  TypeSelector: undefined;
  CreateCycleReminder: {
    reminderId?: string;
    title?: string;
    notes?: string;
    reminderTimes?: string[];
    soundEnabled?: boolean;
    dayStart?: number;
    dayEnd?: number;
    startsOn?: "today" | "tomorrow" | "on";
    startDate?: string;
    ends?: "never" | "on";
    endDate?: string;
  } | undefined;
  CreateCalendarReminder: { 
    reminderId?: string;
    repeatInterval?: number;
    repeatUnit?: "week" | "day";
    selectedDays?: string[];
    ends?: "never" | "on" | "after";
    endDate?: string;
    occurrences?: number;
  } | undefined;
  RepeatFrequency: {
    reminderId?: string;
    repeatInterval?: number;
    repeatUnit?: "week" | "day";
    selectedDays?: string[];
    ends?: "never" | "on" | "after";
    endDate?: string;
    occurrences?: number;
  } | undefined;
  RepeatingDays: {
    title?: string;
    notes?: string;
    reminderTimes?: string[];
    soundEnabled?: boolean;
    dayStart?: number;
    dayEnd?: number;
    startsOn?: "today" | "tomorrow" | "on";
    startDate?: string;
    ends?: "never" | "on";
    endDate?: string;
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

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TypeSelector"
        component={TypeSelectorScreen}
        options={({ navigation }) => ({
          presentation: "modal",
          headerTitle: "New Reminder",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="CreateCycleReminder"
        component={CreateReminderScreen}
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="CreateCalendarReminder"
        component={CreateCalendarReminderScreen}
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="RepeatFrequency"
        component={RepeatFrequencyScreen}
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="RepeatingDays"
        component={RepeatingDaysScreen}
        options={{
          headerShown: false,
          presentation: "card",
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
        options={({ navigation }) => ({
          ...opaqueScreenOptions,
          headerTitle: "Alarm Sound",
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
          ),
        })}
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
