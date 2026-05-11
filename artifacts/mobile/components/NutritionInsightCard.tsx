import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

interface Props {
  totals: Totals;
  goals: Goals;
  hasLogs: boolean;
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  protein:  { icon: "zap",        color: "#2196F3" },
  carbs:    { icon: "battery",    color: "#FFC107" },
  fat:      { icon: "droplet",    color: "#F44336" },
  calories: { icon: "activity",   color: "#FF6B35" },
  fibre:    { icon: "feather",    color: "#4CAF50" },
  general:  { icon: "star",       color: "#9C27B0" },
};

function getTodayKey() {
  return `@bee_insight_${new Date().toISOString().split("T")[0]}`;
}

export function NutritionInsightCard({ totals, goals, hasLogs }: Props) {
  const colors = useColors();
  const [tip, setTip] = useState<string | null>(null);
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchInsight = useCallback(async (force = false) => {
    if (!hasLogs) return;
    setError(false);

    const key = getTodayKey();
    if (!force) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          setTip(parsed.tip);
          setCategory(parsed.category ?? "general");
          return;
        }
      } catch { /* ignore */ }
    }

    setLoading(true);
    setTip(null);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "";
      const res = await fetch(`${baseUrl}/api/food/insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totals, goals }),
      });
      const data = await res.json();
      if (data.tip) {
        setTip(data.tip);
        setCategory(data.category ?? "general");
        await AsyncStorage.setItem(key, JSON.stringify(data));
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [totals, goals, hasLogs]);

  useEffect(() => {
    fetchInsight(false);
  }, [hasLogs]);

  const handleRefresh = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.removeItem(getTodayKey());
    await fetchInsight(true);
  };

  const meta = CATEGORY_META[category] ?? CATEGORY_META.general;

  if (!hasLogs) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: "#F3E5F5" }]}>
            <Feather name="cpu" size={16} color="#9C27B0" />
          </View>
          <Text style={[styles.cardTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
            AI Nutrition Tip
          </Text>
        </View>
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Log a meal first to get your personalized daily nutrition tip.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: meta.color + "18" }]}>
          <Feather name={meta.icon as any} size={16} color={meta.color} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          AI Nutrition Tip
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={loading}
          style={[styles.refreshBtn, { backgroundColor: colors.muted, opacity: loading ? 0.5 : 1 }]}
        >
          <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
          <Text style={[styles.refreshText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            New tip
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.vibrantGreen} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Analysing your meals…
          </Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.errorRow}>
          <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Could not load tip. Tap "New tip" to retry.
          </Text>
        </View>
      )}

      {tip && !loading && (
        <View style={[styles.tipBubble, { backgroundColor: meta.color + "12", borderColor: meta.color + "30" }]}>
          <Text style={[styles.tipText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
            {tip}
          </Text>
        </View>
      )}

      <Text style={[styles.footNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Refreshes daily · Powered by Gemini AI
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { flex: 1, fontSize: 15 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  refreshText: { fontSize: 12 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  loadingText: { fontSize: 13 },
  errorRow: { paddingVertical: 4 },
  errorText: { fontSize: 13 },
  tipBubble: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  tipText: { fontSize: 14, lineHeight: 22 },
  emptyText: { fontSize: 13, lineHeight: 19 },
  footNote: { fontSize: 11 },
});
