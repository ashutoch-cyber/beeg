import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, updateGoals } = useNutrition();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [calories, setCalories] = useState(goals.calories.toString());
  const [protein, setProtein] = useState(goals.protein.toString());
  const [carbs, setCarbs] = useState(goals.carbs.toString());
  const [fat, setFat] = useState(goals.fat.toString());
  const [fibre, setFibre] = useState(goals.fibre.toString());

  const handleSave = async () => {
    const c = parseInt(calories, 10);
    const p = parseInt(protein, 10);
    const carb = parseInt(carbs, 10);
    const f = parseInt(fat, 10);
    const fi = parseInt(fibre, 10);

    if ([c, p, carb, f, fi].some((v) => isNaN(v) || v <= 0)) {
      Alert.alert("Invalid values", "Please enter valid positive numbers.");
      return;
    }

    await updateGoals({ calories: c, protein: p, carbs: carb, fat: f, fibre: fi });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const fields = [
    { label: "Daily Calories", value: calories, onChangeText: setCalories, unit: "kcal", color: "#FF6B35" },
    { label: "Protein", value: protein, onChangeText: setProtein, unit: "g", color: "#2196F3" },
    { label: "Carbs", value: carbs, onChangeText: setCarbs, unit: "g", color: "#FFC107" },
    { label: "Fat", value: fat, onChangeText: setFat, unit: "g", color: "#F44336" },
    { label: "Fibre", value: fibre, onChangeText: setFibre, unit: "g", color: "#4CAF50" },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 12, backgroundColor: colors.darkGreen },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Daily Goals
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={[styles.saveText, { fontFamily: "Inter_600SemiBold" }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Set your daily nutrition targets to track progress on the dashboard.
        </Text>

        {fields.map((field) => (
          <View
            key={field.label}
            style={[
              styles.fieldCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderLeftColor: field.color,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {field.label}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: field.color,
                    fontFamily: "Inter_700Bold",
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                value={field.value}
                onChangeText={field.onChangeText}
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
              />
              <Text
                style={[
                  styles.unit,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {field.unit}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12 },
  saveText: { color: "#FFFFFF", fontSize: 15 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  fieldCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    gap: 12,
  },
  fieldLabel: { fontSize: 15 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    fontSize: 28,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    textAlign: "right",
  },
  unit: { fontSize: 16, width: 40 },
});
