import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { clampSize, isDesktopWidth } from "@/lib/responsive";
import { supabase } from "@/lib/supabase";

const MEAL_GROUPS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snacks" },
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

interface DashboardMacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DashboardMacroRow {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

// Dashboard macro card daily target defaults. Replace with user goals when dynamic goals are wired here.
const DEFAULT_MACRO_GOALS = {
  protein: 120,
  carbs: 300,
  fat: 80,
  calories: 2500,
} as const;

const EMPTY_MACRO_TOTALS: DashboardMacroTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

const DASHBOARD_MACRO_CARDS = [
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    backgroundColor: "#D4E8D0",
    fillColor: "#6A9E7A",
  },
  {
    key: "carbs",
    label: "Carbs",
    unit: "g",
    backgroundColor: "#C8DFF5",
    fillColor: "#5A9AC0",
  },
  {
    key: "fat",
    label: "Fats",
    unit: "g",
    backgroundColor: "#FDDCB5",
    fillColor: "#E8943A",
  },
  {
    key: "calories",
    label: "Calories",
    unit: "kcal",
    backgroundColor: "#F5C8C8",
    fillColor: "#D96B6B",
  },
] as const;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDates(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
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
  const { todayTotals, goals, foodLogRefreshToken } = useNutrition();
  const todayDate = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(todayDate), [todayDate]);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedLogs, setSelectedLogs] = useState<DashboardFoodLog[]>([]);
  const [loadingSelectedLogs, setLoadingSelectedLogs] = useState(false);
  const [macroTotals, setMacroTotals] = useState<DashboardMacroTotals>(EMPTY_MACRO_TOTALS);
  const [loadingMacroTotals, setLoadingMacroTotals] = useState(true);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;
  const isDesktop = isDesktopWidth(width);
  const ringSize = clampSize(width * 0.22, 92, isDesktop ? 132 : 112);
  const monthDates = useMemo(() => getMonthDates(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(
    () => visibleMonth.toLocaleDateString([], { month: "long", year: "numeric" }),
    [visibleMonth],
  );
  const groupedSelectedLogs = useMemo(() => {
    const groups: Partial<Record<MealKey, DashboardFoodLog[]>> = {};

    for (const log of selectedLogs) {
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadTodaysMacroTotals = async () => {
        if (!user) {
          setMacroTotals(EMPTY_MACRO_TOTALS);
          setLoadingMacroTotals(false);
          return;
        }

        setLoadingMacroTotals(true);

        const { data, error } = await supabase
          .from("food_logs")
          .select("calories,protein,carbs,fat")
          .eq("user_id", user.id)
          .eq("date", toDateKey(new Date()));

        if (cancelled) return;

        if (error) {
          console.error("Failed to load today's macro totals", error);
          setMacroTotals(EMPTY_MACRO_TOTALS);
        } else {
          const totals = ((data ?? []) as DashboardMacroRow[]).reduce<DashboardMacroTotals>(
            (acc, row) => ({
              calories: acc.calories + (row.calories ?? 0),
              protein: acc.protein + (row.protein ?? 0),
              carbs: acc.carbs + (row.carbs ?? 0),
              fat: acc.fat + (row.fat ?? 0),
            }),
            EMPTY_MACRO_TOTALS,
          );
          setMacroTotals(totals);
        }

        setLoadingMacroTotals(false);
      };

      loadTodaysMacroTotals().catch((error) => {
        if (cancelled) return;
        console.error("Failed to load today's macro totals", error);
        setMacroTotals(EMPTY_MACRO_TOTALS);
        setLoadingMacroTotals(false);
      });

      return () => {
        cancelled = true;
      };
    }, [foodLogRefreshToken, user]),
  );

  const changeMonth = (direction: -1 | 1) => {
    const nextMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + direction,
      1,
    );
    const isCurrentMonth =
      nextMonth.getFullYear() === todayDate.getFullYear() &&
      nextMonth.getMonth() === todayDate.getMonth();
    const nextSelectedDay = isCurrentMonth ? todayDate.getDate() : 1;

    setVisibleMonth(nextMonth);
    setSelectedDate(
      toDateKey(
        new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextSelectedDay),
      ),
    );
  };

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
      <View
        style={[
          styles.progressCard,
          { backgroundColor: colors.lightAccentGreen, borderColor: colors.border },
        ]}
      >
        <View style={styles.progressCopy}>
          <Text
            style={[
              styles.cardTitle,
              { color: colors.primaryText, fontFamily: "Inter_700Bold" },
            ]}
          >
            Daily Progress
          </Text>
          <Text
            style={[
              styles.progressMeta,
              { color: colors.bodyText, fontFamily: "Inter_500Medium" },
            ]}
          >
            {Math.round(todayTotals.calories)} / {goals.calories} kcal
          </Text>
        </View>
        <ProgressRing
          consumed={todayTotals.calories}
          goal={goals.calories}
          size={ringSize}
        />
      </View>

      <View style={styles.macroCardsGrid}>
        {DASHBOARD_MACRO_CARDS.map((macro) => (
          <DashboardMacroCard
            key={macro.key}
            label={macro.label}
            consumed={macroTotals[macro.key]}
            goal={DEFAULT_MACRO_GOALS[macro.key]}
            unit={macro.unit}
            backgroundColor={macro.backgroundColor}
            fillColor={macro.fillColor}
            loading={loadingMacroTotals}
          />
        ))}
      </View>

      <View
        style={[
          styles.calendarCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.monthButton}
            hitSlop={8}
          >
            <Feather name="chevron-left" size={22} color={colors.primaryText} />
          </TouchableOpacity>
          <Text
            style={[
              styles.monthTitle,
              { color: colors.primaryText, fontFamily: "Inter_700Bold" },
            ]}
          >
            {monthTitle}
          </Text>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.monthButton}
            hitSlop={8}
          >
            <Feather name="chevron-right" size={22} color={colors.primaryText} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
        >
          {monthDates.map((dateItem) => {
            const selected = dateItem.date === selectedDate;
            const isToday = dateItem.date === todayKey;
            const highlighted = selected || isToday;

            return (
              <TouchableOpacity
                key={dateItem.date}
                onPress={() => setSelectedDate(dateItem.date)}
                style={[
                  styles.datePill,
                  {
                    backgroundColor: highlighted
                      ? colors.ctaDarkGreen
                      : colors.cardBackground,
                    borderColor: highlighted ? colors.ctaDarkGreen : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    {
                      color: highlighted ? colors.whiteTextOnGreen : colors.bodyText,
                      fontFamily: highlighted ? "Inter_700Bold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {dateItem.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.mealList}>
          {loadingSelectedLogs ? (
            <Text
              style={[
                styles.emptyText,
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
                <View key={meal.key} style={styles.mealGroup}>
                  <Text
                    style={[
                      styles.mealGroupTitle,
                      { color: colors.primaryText, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {meal.label}
                  </Text>
                  {mealLogs.map((log) => (
                    <View key={log.id} style={styles.mealRow}>
                      {log.image_uri ? (
                        <Image
                          source={{ uri: log.image_uri }}
                          style={styles.mealImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.mealImagePlaceholder,
                            { backgroundColor: colors.lightAccentGreen },
                          ]}
                        >
                          <Feather name="image" size={18} color={colors.mutedForeground} />
                        </View>
                      )}
                      <View style={styles.mealInfo}>
                        <Text
                          style={[
                            styles.mealName,
                            { color: colors.bodyText, fontFamily: "Inter_600SemiBold" },
                          ]}
                          numberOfLines={1}
                        >
                          {log.dish_name}
                        </Text>
                        <Text
                          style={[
                            styles.mealCalories,
                            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                          ]}
                        >
                          {Math.round(log.calories)} kcal
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
          ) : (
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              No snaps logged for this day.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function DashboardMacroCard({
  label,
  consumed,
  goal,
  unit,
  backgroundColor,
  fillColor,
  loading,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: "g" | "kcal";
  backgroundColor: string;
  fillColor: string;
  loading: boolean;
}) {
  const colors = useColors();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progress = loading || goal <= 0 ? 0 : Math.min(consumed / goal, 1);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const roundedConsumed = Math.round(consumed);
  const valueText = loading
    ? "Loading..."
    : unit === "kcal"
      ? `${roundedConsumed} / ${goal} kcal`
      : `${roundedConsumed}g / ${goal}g`;

  return (
    <View
      style={[
        styles.macroCard,
        { backgroundColor, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.macroCardLabel,
          { color: colors.primaryText, fontFamily: "Inter_700Bold" },
        ]}
      >
        {label}
      </Text>
      <View style={styles.macroProgressTrack}>
        <Animated.View
          style={[
            styles.macroProgressFill,
            { backgroundColor: fillColor, width: progressWidth as any },
          ]}
        />
      </View>
      <Text
        style={[
          styles.macroCardMeta,
          { color: colors.bodyText, fontFamily: "Inter_500Medium" },
        ]}
      >
        {valueText}
      </Text>
    </View>
  );
}

function ProgressRing({
  consumed,
  goal,
  size,
}: {
  consumed: number;
  goal: number;
  size: number;
}) {
  const colors = useColors();
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.cardBackground}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.primaryGreen}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <Text
        style={[
          styles.ringText,
          { color: colors.primaryText, fontFamily: "Inter_700Bold" },
        ]}
      >
        {percentage}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  desktopContent: { width: "100%", maxWidth: 960, alignSelf: "center" },
  progressCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    minHeight: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  progressCopy: {
    flex: 1,
    gap: 8,
  },
  cardTitle: { fontSize: 18 },
  progressMeta: { fontSize: 14 },
  macroCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  macroCard: {
    flexBasis: "47%",
    flexGrow: 1,
    flexShrink: 1,
    height: 90,
    minWidth: 0,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  macroCardLabel: { fontSize: 15 },
  macroProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  macroProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  macroCardMeta: { fontSize: 13 },
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: { fontSize: 18 },
  calendarCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { fontSize: 18 },
  dateStripContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  datePill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateNumber: { fontSize: 14 },
  mealList: { gap: 16 },
  mealGroup: { gap: 10 },
  mealGroupTitle: { fontSize: 15 },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mealImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  mealImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mealInfo: {
    flex: 1,
    gap: 2,
  },
  mealName: { fontSize: 14 },
  mealCalories: { fontSize: 12 },
  emptyText: { fontSize: 13 },
});
