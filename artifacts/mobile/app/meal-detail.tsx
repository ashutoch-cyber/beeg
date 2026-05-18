import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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
import palette from "@/constants/colors";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { clampSize, isDesktopWidth } from "@/lib/responsive";

const MEAL_COLORS: Record<string, string> = {
  Breakfast: palette.light.streakLightning,
  Lunch: palette.light.macroProteinColor,
  Dinner: palette.light.buttonGreen,
  Snack: palette.light.highlightGreen,
};

export default function MealDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { logs, removeLog } = useNutrition();
  const [deleting, setDeleting] = useState(false);

  const log = logs.find((l) => l.id === id);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const isDesktop = isDesktopWidth(width);
  const macroValueSize = clampSize(width * 0.05, 29, 38);
  const imageHeight = clampSize(width * 0.58, 210, isDesktop ? 360 : 280);

  if (!log) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.darkGreen }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="x" size={22} color={colors.whiteTextOnGreen} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Meal Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Meal not found
          </Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Remove this meal from your log?")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Remove meal",
        "This will delete the log entry and photo. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    await removeLog(log.id);
    router.back();
  };

  const mealColor = MEAL_COLORS[log.mealType] ?? colors.vibrantGreen;

  const macros = [
    { label: "Calories", value: log.totals.calories, unit: "kcal", color: colors.fatRed },
    { label: "Protein",  value: log.totals.protein,  unit: "g",    color: colors.proteinBlue },
    { label: "Carbs",    value: log.totals.carbs,     unit: "g",    color: colors.carbsYellow },
    { label: "Fat",      value: log.totals.fat,       unit: "g",    color: colors.fatRed },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.darkGreen }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={colors.whiteTextOnGreen} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
          {log.dishName}
        </Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.headerBtn}
          disabled={deleting}
        >
          <Feather name="trash-2" size={20} color={deleting ? colors.whiteOverlay40 : colors.fatRed} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 60 : insets.bottom + 40 },
          isDesktop && styles.desktopContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        {log.imageUri ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: log.imageUri }}
              style={[styles.image, { height: imageHeight }]}
              resizeMode="cover"
            />
            {/* Overlay badges */}
            <View style={styles.imageBadges}>
              <View style={[styles.autoBadge, { backgroundColor: colors.ctaDarkGreenOverlay88 }]}>
                <Feather name="check-circle" size={11} color={colors.whiteTextOnGreen} />
                <Text style={[styles.autoBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                  Auto-Tracked
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="image" size={40} color={colors.mutedForeground} />
          </View>
        )}

        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.dishName, { color: colors.primaryText, fontFamily: "Inter_700Bold" }]}>
              {log.dishName}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.mealBadge, { backgroundColor: colors.lightAccentGreen }]}>
                <Text style={[styles.mealBadgeText, { color: mealColor, fontFamily: "Inter_600SemiBold" }]}>
                  {log.mealType}
                </Text>
              </View>
              <View style={[styles.dateBadge, { backgroundColor: colors.muted }]}>
                <Feather name="calendar" size={11} color={colors.mutedForeground} />
                <Text style={[styles.dateBadgeText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {formatDate(log.date)}
                </Text>
              </View>
              <View style={[styles.dateBadge, { backgroundColor: colors.muted }]}>
                <Feather name="clock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.dateBadgeText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {formatTime(log.loggedAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Macro cards */}
        <View style={styles.macroGrid}>
          {macros.map((m) => (
            <View
              key={m.label}
              style={[
                styles.macroCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderLeftColor: m.color,
                  flexBasis: isDesktop ? "23%" : "48%",
                  maxWidth: isDesktop ? "23%" : "48%",
                },
              ]}
            >
              <Text
                style={[
                  styles.macroValue,
                  {
                    color: m.color,
                    fontFamily: "Inter_700Bold",
                    fontSize: macroValueSize,
                    lineHeight: macroValueSize + 4,
                  },
                ]}
              >
                {Math.round(m.value)}
              </Text>
              <Text style={[styles.macroUnit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {m.unit}
              </Text>
              <Text style={[styles.macroLabel, { color: colors.bodyText, fontFamily: "Inter_500Medium" }]}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Ingredient breakdown */}
        <View style={[styles.ingredientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.primaryText, fontFamily: "Inter_700Bold" }]}>
              Ingredient breakdown
            </Text>
            <Text style={[styles.cardCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {log.ingredients.length} item{log.ingredients.length === 1 ? "" : "s"}
            </Text>
          </View>

          {/* Column headers */}
          <View style={[styles.colHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.colText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", flex: 1 }]}>
              Ingredient
            </Text>
            <Text style={[styles.colText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", width: 56, textAlign: "right" }]}>
              P
            </Text>
            <Text style={[styles.colText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", width: 56, textAlign: "right" }]}>
              C
            </Text>
            <Text style={[styles.colText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", width: 56, textAlign: "right" }]}>
              F
            </Text>
            <Text style={[styles.colText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", width: 64, textAlign: "right" }]}>
              kcal
            </Text>
          </View>

          {log.ingredients.map((ing, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.ingRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.ingName, { color: colors.bodyText, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {ing.name}
                  </Text>
                  <Text style={[styles.ingServing, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {ing.serving}
                  </Text>
                </View>
                <Text style={[styles.ingMacro, { color: colors.proteinBlue, fontFamily: "Inter_500Medium", width: 56 }]}>
                  {Math.round(ing.protein ?? 0)}g
                </Text>
                <Text style={[styles.ingMacro, { color: colors.carbsYellow, fontFamily: "Inter_500Medium", width: 56 }]}>
                  {Math.round(ing.carbs ?? 0)}g
                </Text>
                <Text style={[styles.ingMacro, { color: colors.fatRed, fontFamily: "Inter_500Medium", width: 56 }]}>
                  {Math.round(ing.fat ?? 0)}g
                </Text>
                <Text style={[styles.ingCal, { color: colors.calorieOrange, fontFamily: "Inter_600SemiBold", width: 64 }]}>
                  {Math.round(ing.calories)}
                </Text>
              </View>
            </View>
          ))}

          {/* Totals row */}
          <View style={[styles.totalRow, { borderTopColor: colors.primaryGreen }]}>
            <Text style={[styles.totalLabel, { color: colors.primaryText, fontFamily: "Inter_700Bold", flex: 1 }]}>
              Total
            </Text>
            <Text style={[styles.totalMacro, { color: colors.proteinBlue, fontFamily: "Inter_700Bold", width: 56 }]}>
              {Math.round(log.totals.protein)}g
            </Text>
            <Text style={[styles.totalMacro, { color: colors.carbsYellow, fontFamily: "Inter_700Bold", width: 56 }]}>
              {Math.round(log.totals.carbs)}g
            </Text>
            <Text style={[styles.totalMacro, { color: colors.fatRed, fontFamily: "Inter_700Bold", width: 56 }]}>
              {Math.round(log.totals.fat)}g
            </Text>
            <Text style={[styles.totalCal, { color: colors.primaryText, fontFamily: "Inter_700Bold", width: 64 }]}>
              {Math.round(log.totals.calories)}
            </Text>
          </View>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.fatRed }]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.75}
        >
          <Feather name="trash-2" size={16} color={colors.fatRed} />
          <Text style={[styles.deleteBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {deleting ? "Removing…" : "Remove from log"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function formatDate(dateStr: string) {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yStr) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, color: palette.light.whiteTextOnGreen, textAlign: "center" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 15 },
  scroll: { flex: 1 },
  content: { gap: 16, padding: 16 },
  desktopContent: { width: "100%", maxWidth: 760, alignSelf: "center" },
  imageWrap: { borderRadius: 20, overflow: "hidden", position: "relative" },
  image: { width: "100%" },
  imageBadges: { position: "absolute", top: 12, right: 12, gap: 6 },
  autoBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  autoBadgeText: { color: palette.light.whiteTextOnGreen, fontSize: 11 },
  imagePlaceholder: {
    width: "100%", height: 180, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dishName: { fontSize: 22, lineHeight: 28 },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  mealBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  mealBadgeText: { fontSize: 12 },
  dateBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dateBadgeText: { fontSize: 12 },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  macroCard: {
    flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 112, borderRadius: 16,
    borderWidth: 1, borderLeftWidth: 4, padding: 16, justifyContent: "space-between",
  },
  macroValue: { fontWeight: "700" },
  macroUnit: { fontSize: 12, lineHeight: 16 },
  macroLabel: { fontSize: 14, marginTop: 8 },
  ingredientCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  cardTitle: { fontSize: 16 },
  cardCount: { fontSize: 12 },
  colHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1,
  },
  colText: { fontSize: 11 },
  divider: { height: 1, marginHorizontal: 16 },
  ingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  ingName: { fontSize: 14 },
  ingServing: { fontSize: 11 },
  ingMacro: { fontSize: 13, textAlign: "right" },
  ingCal: { fontSize: 13, textAlign: "right" },
  totalRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 2,
  },
  totalLabel: { fontSize: 14 },
  totalMacro: { fontSize: 13, textAlign: "right" },
  totalCal: { fontSize: 14, textAlign: "right" },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  deleteBtnText: { color: palette.light.macroFatColor, fontSize: 14 },
});
