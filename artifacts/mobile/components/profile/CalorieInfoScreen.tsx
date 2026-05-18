import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  PanResponder,
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
import { isDesktopWidth } from "@/lib/responsive";

import { PROFILE_GREEN, readJsonStorage, writeJsonStorage } from "./storage";

type DietType = "Balanced Diet" | "Low Carb" | "High Protein" | "Keto" | "Custom";

type MacroPrefs = {
  dietType: DietType;
  proteinPct: number;
  carbPct: number;
  fatPct: number;
  savedAt?: string;
};

type MacroKey = "proteinPct" | "carbPct" | "fatPct";

type Props = {
  onBack: () => void;
};

const DIET_OPTIONS: DietType[] = ["Balanced Diet", "Low Carb", "High Protein", "Keto", "Custom"];

const SPLITS: Record<DietType, Omit<MacroPrefs, "dietType" | "savedAt">> = {
  "Balanced Diet": { proteinPct: 20, carbPct: 50, fatPct: 30 },
  "Low Carb": { proteinPct: 30, carbPct: 25, fatPct: 45 },
  "High Protein": { proteinPct: 40, carbPct: 40, fatPct: 20 },
  Keto: { proteinPct: 25, carbPct: 5, fatPct: 70 },
  Custom: { proteinPct: 20, carbPct: 50, fatPct: 30 },
};

export function CalorieInfoScreen({ onBack }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const { goals } = useNutrition();
  const [prefs, setPrefs] = useState<MacroPrefs>({ dietType: "Balanced Diet", ...SPLITS["Balanced Diet"] });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toast, setToast] = useState("");
  const calories = goals?.calories ?? 2500;
  const isCustom = prefs.dietType === "Custom";
  const total = prefs.proteinPct + prefs.carbPct + prefs.fatPct;

  useEffect(() => {
    const saved = readJsonStorage<MacroPrefs | null>("bee_macro_prefs", null);
    if (saved?.dietType) {
      setPrefs({
        dietType: saved.dietType,
        proteinPct: saved.proteinPct ?? SPLITS[saved.dietType].proteinPct,
        carbPct: saved.carbPct ?? SPLITS[saved.dietType].carbPct,
        fatPct: saved.fatPct ?? SPLITS[saved.dietType].fatPct,
        savedAt: saved.savedAt,
      });
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectDiet = (dietType: DietType) => {
    setDropdownOpen(false);
    if (dietType === "Custom") {
      setPrefs((prev) => ({ ...prev, dietType }));
      return;
    }
    setPrefs({ dietType, ...SPLITS[dietType] });
  };

  const updateCustomMacro = (key: MacroKey, value: number) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "proteinPct") {
        const carb = Math.min(next.carbPct, 100 - value);
        return { ...next, carbPct: carb, fatPct: 100 - value - carb };
      }
      if (key === "carbPct") {
        const protein = Math.min(next.proteinPct, 100 - value);
        return { ...next, proteinPct: protein, fatPct: 100 - protein - value };
      }
      const protein = Math.min(next.proteinPct, 100 - value);
      return { ...next, proteinPct: protein, carbPct: 100 - protein - value };
    });
  };

  const save = () => {
    writeJsonStorage("bee_macro_prefs", { ...prefs, savedAt: new Date().toISOString() });
    setToast("Saved successfully!");
  };

  const rows = [
    {
      key: "proteinPct" as const,
      icon: "activity" as const,
      label: "Protein",
      pct: prefs.proteinPct,
      grams: Math.round((calories * prefs.proteinPct) / 100 / 4),
      color: colors.proteinBlue,
    },
    {
      key: "carbPct" as const,
      icon: "zap" as const,
      label: "Carb",
      pct: prefs.carbPct,
      grams: Math.round((calories * prefs.carbPct) / 100 / 4),
      color: colors.carbsYellow,
    },
    {
      key: "fatPct" as const,
      icon: "circle" as const,
      label: "Fat",
      pct: prefs.fatPct,
      grams: Math.round((calories * prefs.fatPct) / 100 / 9),
      color: colors.fatRed,
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={23} color={PROFILE_GREEN} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          Calorie Information
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.desktopContent,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 118 },
        ]}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.budgetRow}>
            <View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Calorie Budget
              </Text>
              <Text style={[styles.budgetValue, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
                {calories} kcal
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.lockBadge, { backgroundColor: colors.muted }]}
              onPress={() => setShowInfo((value) => !value)}
              activeOpacity={0.85}
            >
              <Feather name="lock" size={15} color={PROFILE_GREEN} />
              <Feather name="info" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {showInfo ? (
            <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Locked because this value comes from your existing nutrition goals.
            </Text>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          Macronutrient Budget
        </Text>

        <View style={styles.dropdownWrap}>
          <TouchableOpacity
            style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setDropdownOpen((value) => !value)}
            activeOpacity={0.85}
          >
            <Text style={[styles.dropdownText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {prefs.dietType}
            </Text>
            <Feather name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          {dropdownOpen ? (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {DIET_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  onPress={() => selectDiet(option)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: option === prefs.dietType ? colors.vibrantGreen : colors.foreground,
                        fontFamily: option === prefs.dietType ? "Inter_700Bold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.macroList}>
          {rows.map((row) => (
            <View key={row.key} style={[styles.macroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.macroHeader}>
                <View style={[styles.macroIcon, { backgroundColor: colors.lightAccentGreen }]}>
                  <Feather name={row.icon} size={18} color={row.color} />
                </View>
                <View style={styles.macroTextWrap}>
                  <Text style={[styles.macroName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {row.label}
                  </Text>
                  <Text style={[styles.macroGrams, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {row.grams}g
                  </Text>
                </View>
                <View style={[styles.percentBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.percentText, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
                    {row.pct}%
                  </Text>
                  {!isCustom ? <Feather name="lock" size={12} color={colors.mutedForeground} /> : null}
                </View>
              </View>
              {isCustom ? (
                <PercentSlider
                  value={row.pct}
                  color={row.color}
                  onChange={(value) => updateCustomMacro(row.key, value)}
                />
              ) : null}
            </View>
          ))}
        </View>

        <View style={[styles.totalRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Macronutrient Total:
          </Text>
          <Text style={[styles.totalValue, { color: total === 100 ? colors.highlightGreen : colors.fatRed, fontFamily: "Inter_700Bold" }]}>
            {total}%
          </Text>
        </View>

        <View style={[styles.fibreRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.fibreTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Fibre
            </Text>
            <Text style={[styles.fibreSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              30g (Fixed based on profile)
            </Text>
          </View>
          <Text style={[styles.notEditable, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Not Editable
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.9}>
          <Text style={[styles.saveText, { fontFamily: "Inter_700Bold" }]}>Save</Text>
        </TouchableOpacity>
      </ScrollView>

      {toast ? (
        <View style={styles.toast}>
          <Feather name="check" size={16} color={colors.whiteTextOnGreen} />
          <Text style={[styles.toastText, { fontFamily: "Inter_600SemiBold" }]}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PercentSlider({
  value,
  color,
  onChange,
}: {
  value: number;
  color: string;
  onChange: (value: number) => void;
}) {
  const colors = useColors();
  const [trackWidth, setTrackWidth] = useState(1);
  const percentage = Math.min(Math.max(value, 0), 100);

  const setFromX = (x: number) => {
    const ratio = Math.min(Math.max(x / trackWidth, 0), 1);
    onChange(Math.round((ratio * 100) / 5) * 5);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => setFromX(event.nativeEvent.locationX),
      onPanResponderMove: (event) => setFromX(event.nativeEvent.locationX),
    })
  ).current;

  return (
    <View style={styles.percentSliderWrap}>
      <View
        {...panResponder.panHandlers}
        style={[styles.percentTrack, { backgroundColor: colors.border }]}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width || 1)}
      >
        <View style={[styles.percentFill, { width: `${percentage}%` as any, backgroundColor: color }]} />
        <View style={[styles.percentThumb, { left: `${percentage}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 88,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20 },
  headerSpacer: { width: 44 },
  content: { paddingHorizontal: 16, gap: 16 },
  desktopContent: { width: "100%", maxWidth: 760, alignSelf: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  budgetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  cardLabel: { fontSize: 13 },
  budgetValue: { fontSize: 28, marginTop: 2 },
  lockBadge: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 18 },
  dropdownWrap: { position: "relative", zIndex: 2 },
  dropdownButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: { fontSize: 15 },
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownOption: { minHeight: 44, paddingHorizontal: 16, justifyContent: "center" },
  optionText: { fontSize: 14 },
  macroList: { gap: 12 },
  macroCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 14 },
  macroHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  macroIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  macroTextWrap: { flex: 1, minWidth: 0 },
  macroName: { fontSize: 15 },
  macroGrams: { fontSize: 13, marginTop: 2 },
  percentBadge: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  percentText: { fontSize: 13 },
  percentSliderWrap: { paddingHorizontal: 4 },
  percentTrack: { height: 8, borderRadius: 4 },
  percentFill: { position: "absolute", left: 0, height: 8, borderRadius: 4 },
  percentThumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    top: -7,
  },
  totalRow: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 18 },
  fibreRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fibreTitle: { fontSize: 15 },
  fibreSub: { fontSize: 12, marginTop: 2 },
  notEditable: { fontSize: 12 },
  saveBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: PROFILE_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: palette.light.whiteTextOnGreen, fontSize: 17 },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 98,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: PROFILE_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  toastText: { color: palette.light.whiteTextOnGreen, fontSize: 14 },
});
