import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
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

const MEAL_COLORS: Record<string, string> = {
  Breakfast: "#FF9500",
  Lunch: "#2196F3",
  Dinner: "#9C27B0",
  Snack: "#4CAF50",
};

export default function GalleryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logs } = useNutrition();
  const [filter, setFilter] = useState<"All" | "Breakfast" | "Lunch" | "Dinner" | "Snack">("All");
  const [query, setQuery] = useState("");

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const normalised = query.trim().toLowerCase();

  const logsWithImages = logs.filter((l) => {
    if (!l.imageUri) return false;
    if (filter !== "All" && l.mealType !== filter) return false;
    if (!normalised) return true;

    const dishMatch = l.dishName.toLowerCase().includes(normalised);
    const dateLabel = formatDate(l.date).toLowerCase();
    const dateFull = l.date.toLowerCase();
    const dateMatch = dateLabel.includes(normalised) || dateFull.includes(normalised);
    const mealMatch = l.mealType.toLowerCase().includes(normalised);

    return dishMatch || dateMatch || mealMatch;
  });

  const filters = ["All", "Breakfast", "Lunch", "Dinner", "Snack"] as const;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text
          style={[styles.title, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}
        >
          Snap Gallery
        </Text>
        <TouchableOpacity
          style={[styles.snapBtn, { backgroundColor: colors.vibrantGreen }]}
          onPress={() => router.push("/snap")}
        >
          <Feather name="camera" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.foreground, fontFamily: "Inter_400Regular" },
            ]}
            placeholder="Search meals, dates…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filter === f ? colors.vibrantGreen : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filter === f ? "#FFFFFF" : colors.mutedForeground,
                  fontFamily: filter === f ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count when searching */}
      {normalised.length > 0 && (
        <View style={styles.resultsMeta}>
          <Text
            style={[
              styles.resultsText,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {logsWithImages.length === 0
              ? "No results"
              : `${logsWithImages.length} result${logsWithImages.length === 1 ? "" : "s"}`}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === "web" ? 34 + 80 : insets.bottom + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {logsWithImages.length === 0 ? (
          <View style={styles.empty}>
            {normalised ? (
              <>
                <Feather name="search" size={40} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  No matches for "{query}"
                </Text>
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Try a different dish name, date, or meal type
                </Text>
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: colors.border }]}
                  onPress={() => { setQuery(""); setFilter("All"); }}
                >
                  <Text style={[styles.clearBtnText, { color: colors.vibrantGreen, fontFamily: "Inter_600SemiBold" }]}>
                    Clear search
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Feather name="image" size={48} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  No snaps yet
                </Text>
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  Photos of your meals will appear here after scanning
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.grid}>
            {logsWithImages.map((log) => (
              <TouchableOpacity
                key={log.id}
                style={[styles.gridItem, { borderRadius: 16, overflow: "hidden" }]}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: log.imageUri! }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                <View style={styles.gridOverlay}>
                  <View
                    style={[
                      styles.autoTrackedBadge,
                      { backgroundColor: "rgba(45, 106, 79, 0.9)" },
                    ]}
                  >
                    <Feather name="check-circle" size={10} color="#FFFFFF" />
                    <Text style={[styles.autoTrackedText, { fontFamily: "Inter_600SemiBold" }]}>
                      Auto-Tracked
                    </Text>
                  </View>
                </View>
                <View style={[styles.gridInfo, { backgroundColor: colors.card }]}>
                  <View style={styles.gridInfoTop}>
                    <Text
                      style={[
                        styles.gridDish,
                        { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                      ]}
                      numberOfLines={1}
                    >
                      {highlightMatch(log.dishName, normalised, colors)}
                    </Text>
                    <View
                      style={[
                        styles.mealBadge,
                        { backgroundColor: (MEAL_COLORS[log.mealType] ?? "#4CAF50") + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mealBadgeText,
                          { color: MEAL_COLORS[log.mealType] ?? "#4CAF50", fontFamily: "Inter_500Medium" },
                        ]}
                      >
                        {log.mealType}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gridMacros}>
                    <Text
                      style={[
                        styles.gridCal,
                        { color: colors.calorieOrange, fontFamily: "Inter_700Bold" },
                      ]}
                    >
                      {Math.round(log.totals.calories)} kcal
                    </Text>
                    <Text
                      style={[
                        styles.gridDate,
                        { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                      ]}
                    >
                      {formatDate(log.date)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function highlightMatch(text: string, query: string, colors: ReturnType<typeof useColors>) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Text style={{ color: colors.vibrantGreen, fontFamily: "Inter_700Bold" }}>
        {text.slice(idx, idx + query.length)}
      </Text>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24 },
  snapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterScroll: { maxHeight: 52 },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterText: { fontSize: 13 },
  resultsMeta: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  resultsText: { fontSize: 12 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 13, textAlign: "center", maxWidth: 240 },
  clearBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtnText: { fontSize: 14 },
  grid: { gap: 16 },
  gridItem: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gridImage: { width: "100%", height: 200 },
  gridOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  autoTrackedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoTrackedText: { color: "#FFFFFF", fontSize: 10 },
  gridInfo: { padding: 14, gap: 8 },
  gridInfoTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  gridDish: { flex: 1, fontSize: 15 },
  mealBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  mealBadgeText: { fontSize: 11 },
  gridMacros: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridCal: { fontSize: 15 },
  gridDate: { fontSize: 12 },
});
