import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { MealLogCard } from "@/components/MealLogCard";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { todayTotals, goals, logs, removeLog } = useNutrition();

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.date === today);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text
            style={[
              styles.greeting,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {getGreeting()}
          </Text>
          <Text
            style={[
              styles.title,
              { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
            ]}
          >
            Today's Nutrition
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.goalBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push("/goals")}
        >
          <Feather name="target" size={20} color={colors.vibrantGreen} />
        </TouchableOpacity>
      </View>

      {/* Calorie Ring Card */}
      <View
        style={[
          styles.ringCard,
          { backgroundColor: colors.darkGreen, shadowColor: colors.darkGreen },
        ]}
      >
        <CalorieRing
          consumed={todayTotals.calories}
          goal={goals.calories}
          size={200}
        />
        <View style={styles.ringStats}>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: "#FFFFFF", fontFamily: "Inter_700Bold" },
              ]}
            >
              {Math.round(todayTotals.calories)}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
              ]}
            >
              Consumed
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]}
          />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: "#FFFFFF", fontFamily: "Inter_700Bold" },
              ]}
            >
              {Math.max(goals.calories - Math.round(todayTotals.calories), 0)}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
              ]}
            >
              Remaining
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]}
          />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: "#FFFFFF", fontFamily: "Inter_700Bold" },
              ]}
            >
              {goals.calories}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
              ]}
            >
              Goal
            </Text>
          </View>
        </View>
      </View>

      {/* Macro Bars Card */}
      <View
        style={[
          styles.macroCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
          ]}
        >
          Macros
        </Text>
        <View style={styles.macroList}>
          <MacroBar
            label="Protein"
            current={todayTotals.protein}
            goal={goals.protein}
            color={colors.proteinBlue}
          />
          <MacroBar
            label="Carbs"
            current={todayTotals.carbs}
            goal={goals.carbs}
            color={colors.carbsYellow}
          />
          <MacroBar
            label="Fat"
            current={todayTotals.fat}
            goal={goals.fat}
            color={colors.fatRed}
          />
          <MacroBar
            label="Fibre"
            current={todayTotals.fibre}
            goal={goals.fibre}
            color={colors.fibreGreen}
          />
        </View>
      </View>

      {/* Snap Food FAB */}
      <TouchableOpacity
        style={[styles.snapBtn, { backgroundColor: colors.vibrantGreen }]}
        onPress={() => router.push("/snap")}
        activeOpacity={0.85}
      >
        <Feather name="camera" size={22} color="#FFFFFF" />
        <Text
          style={[styles.snapBtnText, { fontFamily: "Inter_600SemiBold" }]}
        >
          Snap Food
        </Text>
      </TouchableOpacity>

      {/* Today's Meals */}
      {todayLogs.length > 0 && (
        <>
          <Text
            style={[
              styles.mealsTitle,
              { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
            ]}
          >
            Today's Meals
          </Text>
          {todayLogs.map((log) => (
            <MealLogCard key={log.id} log={log} onDelete={removeLog} />
          ))}
        </>
      )}

      {todayLogs.length === 0 && (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="sun" size={32} color={colors.mutedForeground} />
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            No meals logged yet
          </Text>
          <Text
            style={[
              styles.emptyText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Tap "Snap Food" to scan your first meal
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: { fontSize: 13 },
  title: { fontSize: 24, marginTop: 2 },
  goalBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  ringStats: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, height: 32 },
  macroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17 },
  macroList: { gap: 14 },
  snapBtn: {
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  snapBtnText: { color: "#FFFFFF", fontSize: 16 },
  mealsTitle: {
    fontSize: 17,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 13, textAlign: "center" },
});
