import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";

const COST_PER_SCAN = 0.0004;

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, updateGoals, todayScans, monthScans, scanLimit, updateScanLimit, scanHistory } = useNutrition();
  const { user, signOut } = useAuth();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const [calories, setCalories] = useState(goals.calories.toString());
  const [protein, setProtein] = useState(goals.protein.toString());
  const [carbs, setCarbs] = useState(goals.carbs.toString());
  const [fat, setFat] = useState(goals.fat.toString());
  const [fibre, setFibre] = useState(goals.fibre.toString());
  const [limitInput, setLimitInput] = useState(scanLimit.toString());

  const handleSave = async () => {
    const c = parseInt(calories, 10);
    const p = parseInt(protein, 10);
    const carb = parseInt(carbs, 10);
    const f = parseInt(fat, 10);
    const fi = parseInt(fibre, 10);
    const lim = parseInt(limitInput, 10);

    if ([c, p, carb, f, fi].some((v) => isNaN(v) || v <= 0)) {
      Alert.alert("Invalid values", "Please enter valid positive numbers.");
      return;
    }

    await updateGoals({ calories: c, protein: p, carbs: carb, fat: f, fibre: fi });

    if (!isNaN(lim) && lim > 0) {
      await updateScanLimit(lim);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
  };

  const nutritionFields = [
    { label: "Daily Calories", value: calories, onChangeText: setCalories, unit: "kcal", color: "#FF6B35" },
    { label: "Protein", value: protein, onChangeText: setProtein, unit: "g", color: "#2196F3" },
    { label: "Carbs", value: carbs, onChangeText: setCarbs, unit: "g", color: "#FFC107" },
    { label: "Fat", value: fat, onChangeText: setFat, unit: "g", color: "#F44336" },
    { label: "Fibre", value: fibre, onChangeText: setFibre, unit: "g", color: "#4CAF50" },
  ];

  const estimatedMonthlyCost = (monthScans * COST_PER_SCAN).toFixed(4);
  const limitProgress = scanLimit > 0 ? Math.min(todayScans / scanLimit, 1) : 0;
  const limitPct = Math.round(limitProgress * 100);
  const limitBarColor = limitProgress >= 1 ? "#F44336" : limitProgress >= 0.8 ? "#FFC107" : colors.vibrantGreen;

  // Last 7 days for the mini chart
  const last7: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const rec = scanHistory.find((r) => r.date === dateStr);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    last7.push({ label: i === 0 ? "Today" : dayNames[d.getDay()], count: rec?.count ?? 0 });
  }
  const maxCount = Math.max(...last7.map((d) => d.count), 1);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.darkGreen }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Goals & Usage</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={[styles.saveText, { fontFamily: "Inter_600SemiBold" }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Nutrition Goals ── */}
        <Text style={[styles.sectionTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          Nutrition Goals
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Set your daily nutrition targets to track progress on the dashboard.
        </Text>

        {nutritionFields.map((field) => (
          <View
            key={field.label}
            style={[
              styles.fieldCard,
              { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: field.color },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {field.label}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { color: field.color, fontFamily: "Inter_700Bold", borderColor: colors.border, backgroundColor: colors.background },
                ]}
                value={field.value}
                onChangeText={field.onChangeText}
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
              />
              <Text style={[styles.unit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {field.unit}
              </Text>
            </View>
          </View>
        ))}

        {/* ── Scan Usage ── */}
        <Text style={[styles.sectionTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold", marginTop: 8 }]}>
          Scan Usage
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Each "Snap Food" scan uses Gemini AI and costs ~$0.0004. Set a daily limit to stay in control.
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: "Today", value: todayScans.toString(), icon: "zap" as const, color: colors.vibrantGreen },
            { label: "This month", value: monthScans.toString(), icon: "calendar" as const, color: "#2196F3" },
            { label: "Est. cost", value: `$${estimatedMonthlyCost}`, icon: "dollar-sign" as const, color: "#FF6B35" },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={s.icon} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: s.color, fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily limit card */}
        <View style={[styles.limitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.limitHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.limitTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Daily scan limit
              </Text>
              <Text style={[styles.limitSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {todayScans} of {scanLimit} used today
              </Text>
            </View>
            <View style={styles.limitInputWrap}>
              <TextInput
                style={[
                  styles.limitInput,
                  { color: limitBarColor, fontFamily: "Inter_700Bold", borderColor: colors.border, backgroundColor: colors.background },
                ]}
                value={limitInput}
                onChangeText={setLimitInput}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${limitPct}%` as any, backgroundColor: limitBarColor },
              ]}
            />
          </View>
          <Text style={[styles.limitPct, { color: limitBarColor, fontFamily: "Inter_600SemiBold" }]}>
            {limitPct}%{limitProgress >= 1 ? " — limit reached" : limitProgress >= 0.8 ? " — almost at limit" : ""}
          </Text>
        </View>

        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold", marginTop: 8 }]}>
          Account
        </Text>
        <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.accountRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.darkGreen }]}>
              <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() ?? "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountEmail, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {user?.email ?? "Unknown"}
              </Text>
              <Text style={[styles.accountSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Free account
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: "#F44336" }]}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={16} color="#F44336" />
            <Text style={[styles.signOutText, { fontFamily: "Inter_600SemiBold" }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* 7-day mini bar chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
            Scans — last 7 days
          </Text>
          <View style={styles.miniChart}>
            {last7.map((d, i) => {
              const barH = Math.max((d.count / maxCount) * 72, d.count > 0 ? 6 : 0);
              const isToday = i === 6;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barCount, { color: d.count > 0 ? colors.vibrantGreen : "transparent", fontFamily: "Inter_600SemiBold" }]}>
                    {d.count}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                    <View style={[styles.barFill, { height: barH, backgroundColor: isToday ? colors.darkGreen : colors.vibrantGreen, opacity: isToday ? 1 : 0.65 }]} />
                  </View>
                  <Text style={[styles.barLabel, { color: isToday ? colors.darkGreen : colors.mutedForeground, fontFamily: isToday ? "Inter_700Bold" : "Inter_400Regular" }]}>
                    {d.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.costNote, { backgroundColor: colors.muted }]}>
            <Feather name="info" size={13} color={colors.mutedForeground} />
            <Text style={[styles.costNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Google's free tier covers 1,500 scans/day before any charges apply.
            </Text>
          </View>
        </View>
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12 },
  saveText: { color: "#FFFFFF", fontSize: 15 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 14 },
  sectionTitle: { fontSize: 18 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: -6 },
  fieldCard: {
    borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, padding: 16, gap: 12,
  },
  fieldLabel: { fontSize: 15 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1, fontSize: 28, height: 56, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, textAlign: "right",
  },
  unit: { fontSize: 16, width: 40 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 14,
    alignItems: "center", gap: 4,
  },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 11 },
  limitCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  limitHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  limitTitle: { fontSize: 15 },
  limitSub: { fontSize: 12, marginTop: 2 },
  limitInputWrap: {},
  limitInput: {
    width: 72, height: 48, fontSize: 22, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 8, textAlign: "center",
  },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, minWidth: 4 },
  limitPct: { fontSize: 12, marginTop: -4 },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 16 },
  chartTitle: { fontSize: 15 },
  miniChart: { flexDirection: "row", alignItems: "flex-end", gap: 0 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barCount: { fontSize: 10 },
  barTrack: { width: "70%", height: 80, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 9 },
  costNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 10,
  },
  costNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  accountCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_700Bold" },
  accountEmail: { fontSize: 15 },
  accountSub: { fontSize: 12, marginTop: 2 },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  signOutText: { color: "#F44336", fontSize: 15 },
});
