import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import palette from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import type { FoodLog } from "@/context/NutritionContext";

interface MealLogCardProps {
  log: FoodLog;
  onDelete?: (id: string) => void;
}

const MEAL_COLORS: Record<string, string> = {
  Breakfast: palette.light.streakLightning,
  Lunch: palette.light.macroProteinColor,
  Dinner: palette.light.buttonGreen,
  Snack: palette.light.highlightGreen,
};

export function MealLogCard({ log, onDelete }: MealLogCardProps) {
  const colors = useColors();

  const handleDelete = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert("Remove Log", "Remove this food log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => onDelete?.(log.id),
      },
    ]);
  };

  const mealColor = MEAL_COLORS[log.mealType] ?? colors.primary;
  const time = new Date(log.loggedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.mealBadge, { backgroundColor: colors.lightAccentGreen }]}>
          <Text style={[styles.mealType, { color: mealColor, fontFamily: "Inter_600SemiBold" }]}>
            {log.mealType}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {time}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
          <Feather name="trash-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {log.imageUri && (
          <Image
            source={{ uri: log.imageUri }}
            style={[styles.foodImage, { borderRadius: 8 }]}
          />
        )}
        <View style={styles.info}>
          <Text
            style={[styles.dishName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={1}
          >
            {log.dishName}
          </Text>
          <Text style={[styles.ingredientCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {log.ingredients.length} ingredient{log.ingredients.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.macros}>
          <Text style={[styles.calories, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
            {Math.round(log.totals.calories)}
          </Text>
          <Text style={[styles.kcal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            kcal
          </Text>
        </View>
      </View>

      <View style={[styles.macroRow, { borderTopColor: colors.border }]}>
        {[
          { label: "P", value: log.totals.protein, color: colors.proteinBlue },
          { label: "C", value: log.totals.carbs, color: colors.carbsYellow },
          { label: "F", value: log.totals.fat, color: colors.fatRed },
        ].map((m) => (
          <View key={m.label} style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: m.color }]} />
            <Text style={[styles.macroValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              {Math.round(m.value)}g
            </Text>
            <Text style={[styles.macroLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {m.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  mealBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  mealType: {
    fontSize: 12,
  },
  time: {
    flex: 1,
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  foodImage: {
    width: 52,
    height: 52,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  dishName: {
    fontSize: 15,
  },
  ingredientCount: {
    fontSize: 12,
  },
  macros: {
    alignItems: "flex-end",
  },
  calories: {
    fontSize: 24,
    lineHeight: 28,
  },
  kcal: {
    fontSize: 11,
  },
  macroRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  macroItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroValue: {
    fontSize: 13,
  },
  macroLabel: {
    fontSize: 12,
  },
});
