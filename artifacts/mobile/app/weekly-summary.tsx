import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
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
import ViewShot from "react-native-view-shot";
import palette from "@/constants/colors";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { clampSize, isDesktopWidth } from "@/lib/responsive";

const MACRO_COLORS = {
  protein: palette.light.macroProteinColor,
  carbs: palette.light.macroCarbsColor,
  fat: palette.light.macroFatColor,
};

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { monday, sunday, label: `${fmt(monday)} – ${fmt(sunday)}` };
}

function getDayLabel(date: Date) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}

export default function WeeklySummaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { logs, goals, scanHistory } = useNutrition();
  const cardRef = useRef<ViewShot>(null);
  const [saving, setSaving] = useState(false);
  const isWeb = Platform.OS.toString() === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const isDesktop = isDesktopWidth(width);
  const totalCaloriesSize = clampSize(width * 0.095, 32, 42);
  const macroValueSize = clampSize(width * 0.043, 15, 18);

  const { monday, sunday, label: weekLabel } = getWeekRange();

  // Build 7-day data
  const days: { date: Date; dateStr: string; label: string; calories: number; protein: number; carbs: number; fat: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLogs = logs.filter((l) => l.date === dateStr);
    days.push({
      date: d,
      dateStr,
      label: getDayLabel(d),
      calories: dayLogs.reduce((s, l) => s + l.totals.calories, 0),
      protein: dayLogs.reduce((s, l) => s + l.totals.protein, 0),
      carbs: dayLogs.reduce((s, l) => s + l.totals.carbs, 0),
      fat: dayLogs.reduce((s, l) => s + l.totals.fat, 0),
    });
  }

  const totalCal = days.reduce((s, d) => s + d.calories, 0);
  const avgCal = Math.round(totalCal / 7);
  const totalProtein = Math.round(days.reduce((s, d) => s + d.protein, 0));
  const totalCarbs = Math.round(days.reduce((s, d) => s + d.carbs, 0));
  const totalFat = Math.round(days.reduce((s, d) => s + d.fat, 0));
  const maxCal = Math.max(...days.map((d) => d.calories), 1);

  // Weekly scan count
  const weekScans = scanHistory
    .filter((r) => r.date >= monday.toISOString().split("T")[0] && r.date <= sunday.toISOString().split("T")[0])
    .reduce((s, r) => s + r.count, 0);

  // Top 3 logged meals this week (with images, sorted by calories)
  const weekLogs = logs.filter(
    (l) => l.date >= monday.toISOString().split("T")[0] && l.date <= sunday.toISOString().split("T")[0]
  );
  const topMeals = [...weekLogs]
    .sort((a, b) => b.totals.calories - a.totals.calories)
    .slice(0, 3);

  const today = new Date().toISOString().split("T")[0];
  const todayLabel = (dateStr: string) => {
    if (dateStr === today) return "Today";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  };

  const handleSave = async () => {
    if (isWeb) {
      Alert.alert("Save as image", "To save on web, take a screenshot of this screen.");
      return;
    }
    if (!cardRef.current) return;
    setSaving(true);
    try {
      if (!isWeb) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const uri = await (cardRef.current as any).capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your weekly summary" });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert("Saved!", "Your weekly summary has been saved to your photo library.");
        }
      }
    } catch {
      Alert.alert("Error", "Could not save image. Please try again.");
    }
    setSaving(false);
  };

  const goalPct = goals.calories > 0 ? Math.min(avgCal / goals.calories, 1) : 0;
  const goalPctLabel = Math.round(goalPct * 100);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.darkGreen }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={24} color={colors.whiteTextOnGreen} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Weekly Summary</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.shareBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
        >
          <Feather name="share-2" size={18} color={colors.whiteTextOnGreen} />
          <Text style={[styles.shareBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {saving ? "Saving…" : "Share"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          isDesktop && styles.desktopScroll,
          { paddingBottom: isWeb ? 60 : insets.bottom + 40 },
        ]}
      >
        {/* ── Shareable Card ── */}
        <ViewShot
          ref={cardRef}
          options={{ format: "png", quality: 1 }}
          style={styles.cardOuter}
        >
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Card header */}
            <View style={[styles.cardHeader, { backgroundColor: colors.ctaDarkGreen }]}>
              <View style={styles.cardBrand}>
                <Feather name="zap" size={22} color={colors.streakLightning} />
                <Text style={[styles.brandName, { fontFamily: "Inter_700Bold" }]}>Bee</Text>
              </View>
              <Text style={[styles.weekLabel, { fontFamily: "Inter_400Regular" }]}>{weekLabel}</Text>
            </View>

            <View style={styles.cardBody}>
              {/* Calorie summary */}
              <View style={styles.calRow}>
                <View style={styles.calMain}>
                  <Text
                    style={[
                      styles.calBig,
                      {
                        color: colors.fatRed,
                        fontFamily: "Inter_700Bold",
                        fontSize: totalCaloriesSize,
                        lineHeight: totalCaloriesSize + 4,
                      },
                    ]}
                  >
                    {Math.round(totalCal).toLocaleString()}
                  </Text>
                  <Text style={[styles.calSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    total kcal
                  </Text>
                </View>
                <View style={[styles.calDivider, { backgroundColor: colors.border }]} />
                <View style={styles.calSide}>
                  <Text style={[styles.calAvgNum, { color: colors.primaryText, fontFamily: "Inter_700Bold" }]}>
                    {avgCal.toLocaleString()}
                  </Text>
                  <Text style={[styles.calAvgLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    avg / day
                  </Text>
                  <View style={[styles.goalBadge, { backgroundColor: colors.cardBackground }]}>
                    <Text style={[styles.goalBadgeText, { color: colors.mutedText, fontFamily: "Inter_600SemiBold" }]}>
                      {goalPctLabel}% of goal
                    </Text>
                  </View>
                </View>
              </View>

              {/* Macro pills */}
              <View style={styles.macroPills}>
                {([
                  { label: "Protein", value: totalProtein, color: MACRO_COLORS.protein },
                  { label: "Carbs", value: totalCarbs, color: MACRO_COLORS.carbs },
                  { label: "Fat", value: totalFat, color: MACRO_COLORS.fat },
                ] as const).map((m) => (
                  <View key={m.label} style={[styles.macroPill, { borderColor: m.color, backgroundColor: colors.cardBackground }]}>
                    <Text
                      style={[
                        styles.macroPillVal,
                        {
                          color: m.color,
                          fontFamily: "Inter_700Bold",
                          fontSize: macroValueSize,
                          lineHeight: macroValueSize + 4,
                        },
                      ]}
                    >
                      {m.value}g
                    </Text>
                    <Text style={[styles.macroPillLabel, { color: m.color, fontFamily: "Inter_400Regular" }]}>{m.label}</Text>
                  </View>
                ))}
              </View>

              {/* 7-day bar chart */}
              <View style={styles.chartSection}>
                <Text style={[styles.chartTitle, { color: colors.primaryText, fontFamily: "Inter_700Bold" }]}>
                  Calories per day
                </Text>
                <View style={styles.barChart}>
                  {days.map((d, i) => {
                    const isToday = d.dateStr === today;
                    const h = Math.max((d.calories / maxCal) * 90, d.calories > 0 ? 6 : 0);
                    return (
                      <View key={i} style={styles.barCol}>
                        {d.calories > 0 && (
                          <Text style={[styles.barVal, { color: isToday ? colors.bodyText : colors.mutedText, fontFamily: "Inter_600SemiBold" }]}>
                            {Math.round(d.calories / 100) * 100 >= 1000
                              ? `${(d.calories / 1000).toFixed(1)}k`
                              : Math.round(d.calories)}
                          </Text>
                        )}
                        <View style={[styles.barTrack, { backgroundColor: colors.lightAccentGreen }]}>
                          <View style={[styles.barFill, {
                            height: h,
                            backgroundColor: colors.highlightGreen,
                            opacity: isToday ? 1 : 0.7,
                          }]} />
                        </View>
                        <Text style={[styles.barDay, {
                          color: isToday ? colors.bodyText : colors.mutedText,
                          fontFamily: isToday ? "Inter_700Bold" : "Inter_400Regular",
                        }]}>{d.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Scan badge */}
              <View style={[styles.scanBadge, { backgroundColor: colors.cardBackground }]}>
                <Feather name="zap" size={14} color={colors.streakLightning} />
                <Text style={[styles.scanBadgeText, { color: colors.bodyText, fontFamily: "Inter_500Medium" }]}>
                  {weekScans} AI scan{weekScans !== 1 ? "s" : ""} this week
                </Text>
                <Text style={[styles.scanCost, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  (~${(weekScans * 0.0004).toFixed(4)})
                </Text>
              </View>

              {/* Top meals */}
              {topMeals.length > 0 && (
                <View style={styles.topMeals}>
                  <Text style={[styles.topMealsTitle, { color: colors.primaryText, fontFamily: "Inter_700Bold" }]}>
                    Top meals this week
                  </Text>
                  {topMeals.map((meal, i) => (
                    <View key={meal.id} style={[styles.mealRow, { borderColor: colors.border }]}>
                      <View style={[styles.rankBadge, { backgroundColor: i === 0 ? colors.streakLightning : i === 1 ? colors.buttonGreen : colors.ctaDarkGreen }]}>
                        <Text style={[styles.rankText, { fontFamily: "Inter_700Bold" }]}>{i + 1}</Text>
                      </View>
                      {meal.imageUri ? (
                        <Image source={{ uri: meal.imageUri }} style={styles.mealThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.mealThumbFallback, { backgroundColor: colors.muted }]}>
                          <Feather name="image" size={16} color={colors.mutedForeground} />
                        </View>
                      )}
                      <View style={styles.mealInfo}>
                        <Text style={[styles.mealName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                          {meal.dishName}
                        </Text>
                        <Text style={[styles.mealMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                          {meal.mealType} · {todayLabel(meal.date)}
                        </Text>
                      </View>
                      <Text style={[styles.mealCal, { color: colors.fatRed, fontFamily: "Inter_700Bold" }]}>
                        {Math.round(meal.totals.calories)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Watermark */}
              <View style={styles.watermark}>
                <Feather name="zap" size={11} color={colors.mutedForeground} />
                <Text style={[styles.watermarkText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Tracked with Bee
                </Text>
              </View>
            </View>
          </View>
        </ViewShot>

        {/* Empty state */}
        {weekLogs.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.primaryText, fontFamily: "Inter_600SemiBold" }]}>
              No meals logged this week
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Start snapping your food — your weekly summary will build up as you log meals.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, color: palette.light.whiteTextOnGreen },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    minHeight: 44, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: palette.light.whiteOverlay15, borderRadius: 12,
  },
  shareBtnText: { color: palette.light.whiteTextOnGreen, fontSize: 14 },
  scroll: { padding: 16, gap: 16 },
  desktopScroll: { width: "100%", maxWidth: 760, alignSelf: "center" },
  cardOuter: { borderRadius: 20, overflow: "hidden" },
  card: { borderRadius: 20, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
  },
  cardBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { fontSize: 22, color: palette.light.whiteTextOnGreen },
  weekLabel: { fontSize: 13, color: palette.light.whiteOverlay80 },
  cardBody: { padding: 20, gap: 20 },
  calRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  calMain: { flex: 1, alignItems: "center" },
  calBig: { fontSize: 42, lineHeight: 46 },
  calSub: { fontSize: 13, marginTop: 2 },
  calDivider: { width: 1, height: 60 },
  calSide: { flex: 1, alignItems: "center", gap: 4 },
  calAvgNum: { fontSize: 26 },
  calAvgLabel: { fontSize: 12 },
  goalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  goalBadgeText: { fontSize: 11 },
  macroPills: { flexDirection: "row", gap: 8 },
  macroPill: {
    flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1.5,
  },
  macroPillVal: { fontSize: 18, textAlign: "center" },
  macroPillLabel: { fontSize: 11, marginTop: 2 },
  chartSection: { gap: 12 },
  chartTitle: { fontSize: 14 },
  barChart: { flexDirection: "row", alignItems: "flex-end", gap: 0 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barVal: { fontSize: 9 },
  barTrack: { width: "75%", height: 90, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 6 },
  barDay: { fontSize: 10 },
  scanBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, alignSelf: "flex-start",
  },
  scanBadgeText: { fontSize: 13 },
  scanCost: { fontSize: 11 },
  topMeals: { gap: 10 },
  topMealsTitle: { fontSize: 14 },
  mealRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderBottomWidth: 1, paddingBottom: 10,
  },
  rankBadge: {
    width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  rankText: { fontSize: 11, color: palette.light.whiteTextOnGreen },
  mealThumb: { width: 44, height: 44, borderRadius: 10 },
  mealThumbFallback: {
    width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  mealInfo: { flex: 1, gap: 2 },
  mealName: { fontSize: 13 },
  mealMeta: { fontSize: 11 },
  mealCal: { fontSize: 15 },
  watermark: {
    flexDirection: "row", alignItems: "center", gap: 5,
    justifyContent: "center", paddingTop: 4,
  },
  watermarkText: { fontSize: 11 },
  emptyCard: {
    borderRadius: 20, borderWidth: 1, padding: 32,
    alignItems: "center", gap: 12,
  },
  emptyTitle: { fontSize: 16, textAlign: "center" },
  emptyDesc: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
