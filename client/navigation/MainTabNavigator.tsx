import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { View, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import HomeScreen from "@/screens/HomeScreen";
import RemindersScreen from "@/screens/RemindersScreen";
import type { RootStackParamList } from "./RootStackNavigator";

const Tab = createBottomTabNavigator();

function CreateButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.createButtonContainer}>
      <Pressable
        style={[styles.createButton, { backgroundColor: "#E8614F" }]}
        onPress={() => navigation.navigate("CreateReminder")}
        testID="fab-create"
      >
        <Feather name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#F5F0E8",
          borderTopColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#E8614F",
        tabBarInactiveTintColor: "#6B5744",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          fontFamily: "PlusJakartaSans_500Medium",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={View}
        options={{
          tabBarButton: () => <CreateButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name="bell" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createButtonContainer: {
    position: "relative",
    top: -15,
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
