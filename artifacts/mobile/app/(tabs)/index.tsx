import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBar } from "@/components/MacroBar";
import { MealLogCard } from "@/components/MealLogCard";
import { NutritionInsightCard } from "@/components/NutritionInsightCard";
import { WeeklyChart } from "@/components/WeeklyChart";
import { useAuth } from "@/context/AuthContext";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { clampSize, isDesktopWidth } from "@/lib/responsive";
import { supabase } from "@/lib/supabase";

const MEAL_GROUPS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
] as const;

type MealKey = (typeof MEAL_GROUPS)[number]["key"];

interface DashboardFoodLog {
  id: string;
  meal_type: string;
  dish_name: string;
  image_uri: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return {
      day,
      date: toDateKey(new Date(year, month, day)),
    };
  });
}

function getMealKey(mealType: string): MealKey | null {
  const key = mealType.toLowerCase();
  return MEAL_GROUPS.some((meal) => meal.key === key) ? (key as MealKey) : null;
}

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { todayTotals, goals, logs, removeLog } = useNutrition();
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [selectedLogs, setSelectedLogs] = useState<DashboardFoodLog[]>([]);
  const [loadingSelectedLogs, setLoadingSelectedLogs] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.date === today);
  const monthDates = useMemo(() => getCurrentMonthDates(), []);
  const groupedSelectedLogs = useMemo(() => {
    const groups: Partial<Record<MealKey, DashboardFoodLog[]>> = {};

    for (const log of selectedLogs) {
      if (!log.image_uri) continue;

      const key = getMealKey(log.meal_type);
      if (!key) continue;

      groups[key] ??= [];
      groups[key]?.push(log);
    }

    return groups;
  }, [selectedLogs]);
  const hasSelectedSnaps = MEAL_GROUPS.some(
    (meal) => (groupedSelectedLogs[meal.key]?.length ?? 0) > 0,
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;
  const isDesktop = isDesktopWidth(width);
  const ringSize = clampSize(width * 0.46, 168, isDesktop ? 220 : 200);

  useEffect(() => {
    let cancelled = false;

    const loadLogsForDate = async () => {
      if (!user) {
        setSelectedLogs([]);
        setLoadingSelectedLogs(false);
        return;
      }

      setLoadingSelectedLogs(true);

      const { data, error } = await supabase
        .from("food_logs")
        .select("id,meal_type,dish_name,image_uri,calories,protein,carbs,fat,logged_at")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .order("logged_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load food logs for selected date", error);
        setSelectedLogs([]);
      } else {
        setSelectedLogs((data ?? []) as DashboardFoodLog[]);
      }

      setLoadingSelectedLogs(false);
    };

    loadLogsForDate().catch((error) => {
      if (cancelled) return;
      console.error("Failed to load food logs for selected date", error);
      setSelectedLogs([]);
      setLoadingSelectedLogs(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, user]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 100 },
        isDesktop && styles.desktopContent,
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
              { color: colors.primaryText, fontFamily: "Inter_700Bold" },
            ]}
          >
            Today's Nutrition
          </Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.goalBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/goals")}
          >
            <Feather name="target" size={20} color={colors.buttonGreen} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Daily Progress Card */}
      <View
        style={[
          styles.dailyProgressCard,
          { backgroundColor: colors.primaryGreen, shadowColor: colors.primaryGreen },
        ]}
      >
        <View style={styles.progressRingColumn}>
          <CalorieRing
            consumed={todayTotals.calories}
            goal={goals.calories}
            size={ringSize}
          />
          <Text
            style={[
              styles.progressLabel,
              { color: colors.whiteTextOnGreen, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Daily Progress
          </Text>
        </View>

        <View style={styles.dateStripColumn}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStripContent}
          >
            {monthDates.map((dateItem) => {
              const selected = dateItem.date === selectedDate;
              return (
                <TouchableOpacity
                  key={dateItem.date}
                  onPress={() => setSelectedDate(dateItem.date)}
                  style={[
                    styles.datePill,
                    {
                      backgroundColor: selected
                        ? colors.ctaDarkGreen
                        : colors.whiteOverlay15,
                      borderColor: selected
                        ? colors.whiteTextOnGreen
                        : colors.whiteOverlay25,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateNumber,
                      {
                        color: selected
                          ? colors.whiteTextOnGreen
                          : colors.whiteOverlay80,
                        fontFamily: selected
                          ? "Inter_700Bold"
                          : "Inter_500Medium",
                      },
                    ]}
                  >
                    {dateItem.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.snapViewer}>
        {loadingSelectedLogs ? (
          <Text
            style={[
              styles.snapEmptyText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            Loading snaps...
          </Text>
        ) : hasSelectedSnaps ? (
          MEAL_GROUPS.map((meal) => {
            const mealLogs = groupedSelectedLogs[meal.key] ?? [];
            if (mealLogs.length === 0) return null;

            return (
              <View key={meal.key} style={styles.mealSnapGroup}>
                <Text
                  style={[
                    styles.mealSnapLabel,
                    { color: colors.primaryText, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {meal.label}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.snapThumbRow}
                >
                  {mealLogs.map((log) =>
                    log.image_uri ? (
                      <Image
                        key={log.id}
                        source={{ uri: log.image_uri }}
                        style={[
                          styles.snapThumb,
                          { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                        resizeMode="cover"
                      />
                    ) : null,
                  )}
                </ScrollView>
              </View>
            );
          })
        ) : (
          <Text
            style={[
              styles.snapEmptyText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            No snaps logged for this day.
          </Text>
        )}
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
            { color: colors.primaryGreen, fontFamily: "Inter_700Bold" },
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

      {/* AI Nutrition Insight */}
      <NutritionInsightCard
        totals={todayTotals}
        goals={goals}
        hasLogs={todayLogs.length > 0}
      />

      {/* Weekly Chart */}
      <WeeklyChart />

      {/* Snap Food FAB */}
      <TouchableOpacity
        style={[styles.snapBtn, { backgroundColor: colors.ctaDarkGreen }]}
        onPress={() => router.push("/snap")}
        activeOpacity={0.85}
      >
        <Feather name="camera" size={22} color={colors.primaryForeground} />
        <Text
          style={[
            styles.snapBtnText,
            { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
          ]}
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
              { color: colors.primaryText, fontFamily: "Inter_700Bold" },
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
              { color: colors.primaryText, fontFamily: "Inter_600SemiBold" },
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
  const storage = (globalThis as typeof globalThis & {
    localStorage?: { getItem: (key: string) => string | null };
  }).localStorage;
  let username = "";
  try {
    username = storage?.getItem("bee_username")?.trim() ?? "";
  } catch {
    username = "";
  }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${greeting}${username ? `, ${username}` : ""}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 0 },
  desktopContent: { width: "100%", maxWidth: 960, alignSelf: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: { fontSize: 13 },
  title: { fontSize: 24, marginTop: 2 },
  headerBtns: { flexDirection: "row", gap: 8 },
  goalBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dailyProgressCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  progressRingColumn: {
    alignItems: "center",
    gap: 8,
  },
  progressLabel: { fontSize: 14 },
  dateStripColumn: {
    flex: 1,
    minWidth: 0,
  },
  dateStripContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  datePill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNumber: { fontSize: 15 },
  snapViewer: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 14,
  },
  mealSnapGroup: { gap: 8 },
  mealSnapLabel: { fontSize: 14 },
  snapThumbRow: {
    gap: 8,
    flexDirection: "row",
  },
  snapThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
  },
  snapEmptyText: { fontSize: 13 },
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
    minHeight: 48,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  snapBtnText: { fontSize: 16 },
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
