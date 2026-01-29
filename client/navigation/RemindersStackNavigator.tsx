import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RemindersScreen from "@/screens/RemindersScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RemindersStackParamList = {
  Reminders: undefined;
};

const Stack = createNativeStackNavigator<RemindersStackParamList>();

export default function RemindersStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          headerTitle: "Reminders",
        }}
      />
    </Stack.Navigator>
  );
}
