import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MoreScreen from "@/screens/MoreScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import SnoozeSettingsScreen from "@/screens/SnoozeSettingsScreen";
import AlarmSoundsScreen from "@/screens/AlarmSoundsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type MoreStackParamList = {
  More: undefined;
  History: undefined;
  SnoozeSettings: undefined;
  AlarmSounds: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="More"
        component={MoreScreen}
        options={{
          headerTitle: "More",
        }}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerTitle: "History",
        }}
      />
      <Stack.Screen
        name="SnoozeSettings"
        component={SnoozeSettingsScreen}
        options={{
          headerTitle: "Snooze Settings",
        }}
      />
      <Stack.Screen
        name="AlarmSounds"
        component={AlarmSoundsScreen}
        options={{
          headerTitle: "Alarm Sounds",
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: "Profile",
        }}
      />
    </Stack.Navigator>
  );
}
