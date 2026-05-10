import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";

export default function LogConfirmScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addLog } = useNutrition();
  const params = useLocalSearchParams<{
    result: string;
    mealType: string;
    imageUri: string;
    date: string;
  }>();

  const result = params.result ? JSON.parse(params.result) : null;
  const mealType = (params.mealType ?? "Lunch") as "Breakfast" | "Lunch" | "Dinner" | "Snack";
  const imageUri = params.imageUri || undefined;
  const date = params.date ?? new Date().toISOString().split("T")[0];

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleConfirm = async () => {
    if (!result) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await addLog({
      date,
      mealType,
      dishName: result.dishName,
      imageUri,
      ingredients: result.ingredients,
      totals: result.totals,
    });
    router.replace("/(tabs)");
  };

  if (!result) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>No data</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.darkGreen,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Confirm Log
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === "web" ? 34 + 100 : insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.image, { borderRadius: 20 }]}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.mealBadge,
              { backgroundColor: colors.paleGreen },
            ]}
          >
            <Text
              style={[
                styles.mealType,
                { color: colors.vibrantGreen, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {mealType}
            </Text>
          </View>
          <Text
            style={[
              styles.dishName,
              { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
            ]}
          >
            {result.dishName}
          </Text>
        </View>

        {/* Macro Cards */}
        <View style={styles.macroGrid}>
          {[
            { label: "Calories", value: result.totals.calories, unit: "kcal", color: "#FF6B35" },
            { label: "Protein", value: result.totals.protein, unit: "g", color: "#2196F3" },
            { label: "Carbs", value: result.totals.carbs, unit: "g", color: "#FFC107" },
            { label: "Fat", value: result.totals.fat, unit: "g", color: "#F44336" },
          ].map((m) => (
            <View
              key={m.label}
              style={[
                styles.macroCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderLeftColor: m.color,
                },
              ]}
            >
              <Text
                style={[
                  styles.macroValue,
                  { color: m.color, fontFamily: "Inter_700Bold" },
                ]}
              >
                {Math.round(m.value)}
              </Text>
              <Text
                style={[
                  styles.macroUnit,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {m.unit}
              </Text>
              <Text
                style={[
                  styles.macroLabel,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
              >
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Ingredients */}
        <View
          style={[
            styles.ingredientList,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.listTitle,
              { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
            ]}
          >
            Ingredient breakdown
          </Text>
          {result.ingredients.map(
            (
              ing: { name: string; serving: string; calories: number },
              i: number
            ) => (
              <View key={i}>
                {i > 0 && (
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                )}
                <View style={styles.ingredientRow}>
                  <View style={styles.ingLeft}>
                    <Text
                      style={[
                        styles.ingName,
                        {
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                    >
                      {ing.name}
                    </Text>
                    <Text
                      style={[
                        styles.ingServing,
                        {
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                        },
                      ]}
                    >
                      {ing.serving}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ingCal,
                      {
                        color: colors.calorieOrange,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                  >
                    {Math.round(ing.calories)} Cal
                  </Text>
                </View>
              </View>
            )
          )}
          <View
            style={[styles.totalRow, { borderTopColor: colors.darkGreen }]}
          >
            <Text
              style={[
                styles.totalLabel,
                { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
              ]}
            >
              Total
            </Text>
            <Text
              style={[
                styles.totalCal,
                { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
              ]}
            >
              {Math.round(result.totals.calories)} Cal
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom:
              Platform.OS === "web" ? 34 : insets.bottom + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.cancelBtn,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
        >
          <Text
            style={[
              styles.cancelText,
              { color: colors.darkGreen, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.vibrantGreen }]}
          onPress={handleConfirm}
        >
          <Text style={[styles.confirmText, { fontFamily: "Inter_700Bold" }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  image: { width: "100%", height: 200 },
  summaryCard: { gap: 8 },
  mealBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mealType: { fontSize: 13 },
  dishName: { fontSize: 24 },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  macroCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 2,
  },
  macroValue: { fontSize: 28, lineHeight: 32 },
  macroUnit: { fontSize: 12 },
  macroLabel: { fontSize: 13, marginTop: 2 },
  ingredientList: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  listTitle: { fontSize: 16, padding: 16, paddingBottom: 12 },
  divider: { height: 1, marginHorizontal: 16 },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingVertical: 12,
  },
  ingLeft: { flex: 1, gap: 2 },
  ingName: { fontSize: 14 },
  ingServing: { fontSize: 12 },
  ingCal: { fontSize: 14 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    paddingVertical: 14,
    borderTopWidth: 2,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15 },
  totalCal: { fontSize: 15 },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },
  cancelText: { fontSize: 16 },
  confirmBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
  },
  confirmText: { color: "#FFFFFF", fontSize: 16 },
});
