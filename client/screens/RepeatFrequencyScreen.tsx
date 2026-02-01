import React, { useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, TextInput, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "RepeatFrequency">;

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function RepeatFrequencyScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const params = route.params || {};
  
  const [repeatInterval, setRepeatInterval] = useState(params.repeatInterval?.toString() || "1");
  const [repeatUnit, setRepeatUnit] = useState<"week" | "day">(params.repeatUnit || "week");
  const [selectedDays, setSelectedDays] = useState<string[]>(params.selectedDays || []);
  const [ends, setEnds] = useState<"never" | "on" | "after">(params.ends || "never");
  const [endDate, setEndDate] = useState<Date>(params.endDate ? new Date(params.endDate) : new Date());
  const [occurrences, setOccurrences] = useState(params.occurrences?.toString() || "1");
  
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const toggleDay = (dayKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedDays.includes(dayKey)) {
      setSelectedDays(selectedDays.filter(d => d !== dayKey));
    } else {
      setSelectedDays([...selectedDays, dayKey]);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newParams = {
      ...params,
      repeatInterval: parseInt(repeatInterval) || 1,
      repeatUnit,
      selectedDays,
      ends,
      endDate: endDate.toISOString(),
      occurrences: parseInt(occurrences) || 1,
    };
    
    navigation.dispatch((state) => {
      const routes = state.routes.slice(0, -1);
      if (routes.length > 0) {
        routes[routes.length - 1] = {
          ...routes[routes.length - 1],
          params: newParams,
        };
      }
      return CommonActions.reset({
        ...state,
        routes,
        index: routes.length - 1,
      });
    });
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowEndDatePicker(false);
      if (event.type === "set" && selectedDate) {
        setEndDate(selectedDate);
      }
    } else if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3" style={styles.headerTitle}>
          Repeat frequency
        </ThemedText>
        <Pressable onPress={handleDone} style={styles.doneButton}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Done
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { borderBottomColor: theme.border }]}>
          <ThemedText type="body" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Repeat every
          </ThemedText>
          <View style={styles.repeatEveryRow}>
            <View style={[styles.numberInputContainer, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.numberInput, { color: theme.text }]}
                value={repeatInterval}
                onChangeText={setRepeatInterval}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Pressable 
              style={[styles.unitSelector, { borderColor: theme.border }]}
              onPress={() => setShowUnitPicker(true)}
            >
              <ThemedText type="body">
                {repeatUnit === "week" ? "Week" : "Day"}
              </ThemedText>
              <Feather name="chevron-down" size={18} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {repeatUnit === "week" ? (
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <ThemedText type="body" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Repeat on
            </ThemedText>
            <View style={styles.daysRow}>
              {DAYS.map((day, index) => {
                const dayKey = DAY_KEYS[index];
                const isSelected = selectedDays.includes(dayKey);
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.dayCircle,
                      { borderColor: theme.border },
                      isSelected && { backgroundColor: theme.text, borderColor: theme.text },
                    ]}
                    onPress={() => toggleDay(dayKey)}
                  >
                    <ThemedText 
                      type="body" 
                      style={[
                        styles.dayText,
                        isSelected && { color: "#FFFFFF" },
                      ]}
                    >
                      {day}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="body" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Ends
          </ThemedText>
          
          <Pressable 
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEnds("never");
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
              ends === "never" && styles.radioSelected,
            ]}>
              {ends === "never" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={styles.radioLabel}>
              Never
            </ThemedText>
          </Pressable>

          <Pressable 
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEnds("on");
              setShowEndDatePicker(true);
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
              ends === "on" && styles.radioSelected,
            ]}>
              {ends === "on" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={styles.radioLabel}>
              On
            </ThemedText>
            <Pressable 
              style={[styles.dateButton, { borderColor: theme.border }]}
              onPress={() => {
                setEnds("on");
                setShowEndDatePicker(true);
              }}
            >
              <ThemedText type="small">
                {formatDate(endDate)}
              </ThemedText>
            </Pressable>
          </Pressable>

          <Pressable 
            style={styles.radioRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEnds("after");
            }}
          >
            <View style={[
              styles.radio,
              { borderColor: theme.text },
              ends === "after" && styles.radioSelected,
            ]}>
              {ends === "after" ? (
                <View style={[styles.radioInner, { backgroundColor: theme.text }]} />
              ) : null}
            </View>
            <ThemedText type="body" style={styles.radioLabel}>
              After
            </ThemedText>
            <View style={[styles.occurrenceInput, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.occurrenceText, { color: theme.text }]}
                value={occurrences}
                onChangeText={setOccurrences}
                keyboardType="number-pad"
                maxLength={3}
                onFocus={() => setEnds("after")}
              />
            </View>
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
              occurrence
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowUnitPicker(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: theme.backgroundDefault }]}>
            <Pressable 
              style={[styles.pickerOption, { borderBottomColor: theme.border }]}
              onPress={() => {
                setRepeatUnit("day");
                setShowUnitPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText type="body">Day</ThemedText>
              {repeatUnit === "day" ? (
                <Feather name="check" size={20} color={theme.primary} />
              ) : null}
            </Pressable>
            <Pressable 
              style={styles.pickerOption}
              onPress={() => {
                setRepeatUnit("week");
                setShowUnitPicker(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText type="body">Week</ThemedText>
              {repeatUnit === "week" ? (
                <Feather name="check" size={20} color={theme.primary} />
              ) : null}
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {showEndDatePicker && Platform.OS === "android" ? (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={new Date()}
        />
      ) : null}

      <Modal
        visible={showEndDatePicker && Platform.OS !== "android"}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.datePickerModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3" style={{ fontWeight: "600" }}>
                Select end date
              </ThemedText>
            </View>
            {Platform.OS === "web" ? (
              <TextInput
                style={[styles.webDateInput, { color: theme.text, borderColor: theme.border }]}
                value={endDate.toISOString().split("T")[0]}
                onChangeText={(text) => {
                  const date = new Date(text);
                  if (!isNaN(date.getTime())) {
                    setEndDate(date);
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
              />
            ) : (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="spinner"
                onChange={handleEndDateChange}
                minimumDate={new Date()}
              />
            )}
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowEndDatePicker(false)}
              >
                <ThemedText type="body">Cancel</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowEndDatePicker(false)}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Done
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    marginLeft: Spacing.md,
    fontWeight: "600",
  },
  doneButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    fontWeight: "500",
  },
  repeatEveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  numberInputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 50,
    alignItems: "center",
  },
  numberInput: {
    fontSize: 16,
    textAlign: "center",
    minWidth: 30,
  },
  unitSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  daysRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {},
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    marginLeft: Spacing.md,
  },
  dateButton: {
    marginLeft: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: 6,
  },
  occurrenceInput: {
    marginLeft: Spacing.md,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 40,
  },
  occurrenceText: {
    fontSize: 14,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModal: {
    borderRadius: 12,
    minWidth: 200,
    overflow: "hidden",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
  },
  datePickerModal: {
    borderRadius: 16,
    padding: Spacing.xl,
    width: "85%",
    maxWidth: 340,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  webDateInput: {
    fontSize: 18,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: "center",
  },
});
