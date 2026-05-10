import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const logsWithImages = logs.filter(
    (l) => l.imageUri && (filter === "All" || l.mealType === filter)
  );

  const filters = ["All", "Breakfast", "Lunch", "Dinner", "Snack"] as const;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
          style={[
            styles.title,
            { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
          ]}
        >
          Snap Gallery
        </Text>
        <TouchableOpacity
          style={[
            styles.snapBtn,
            { backgroundColor: colors.vibrantGreen },
          ]}
          onPress={() => router.push("/snap")}
        >
          <Feather name="camera" size={16} color="#FFFFFF" />
        </TouchableOpacity>
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
                <View
                  style={[styles.gridInfo, { backgroundColor: colors.card }]}
                >
                  <View style={styles.gridInfoTop}>
                    <Text
                      style={[
                        styles.gridDish,
                        {
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {log.dishName}
                    </Text>
                    <View
                      style={[
                        styles.mealBadge,
                        {
                          backgroundColor:
                            (MEAL_COLORS[log.mealType] ?? "#4CAF50") + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mealBadgeText,
                          {
                            color:
                              MEAL_COLORS[log.mealType] ?? "#4CAF50",
                            fontFamily: "Inter_500Medium",
                          },
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
                        {
                          color: colors.calorieOrange,
                          fontFamily: "Inter_700Bold",
                        },
                      ]}
                    >
                      {Math.round(log.totals.calories)} kcal
                    </Text>
                    <Text
                      style={[
                        styles.gridDate,
                        {
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                        },
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
    paddingBottom: 16,
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
  filterScroll: { maxHeight: 56 },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: { fontSize: 13 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 13, textAlign: "center", maxWidth: 240 },
  grid: { gap: 16 },
  gridItem: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
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
  gridInfoTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  gridDish: { flex: 1, fontSize: 15 },
  mealBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  mealBadgeText: { fontSize: 11 },
  gridMacros: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gridCal: { fontSize: 15 },
  gridDate: { fontSize: 12 },
});
