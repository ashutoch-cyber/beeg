import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { isDesktopWidth } from "@/lib/responsive";

import { PROFILE_GREEN, readJsonStorage, writeJsonStorage } from "./storage";

type BasicInfo = {
  height: string;
  heightUnit: "cm" | "ft";
  weight: string;
  weightUnit: "kg" | "lb";
  age: string;
  gender: string;
};

const DEFAULT_BASIC_INFO: BasicInfo = {
  height: "",
  heightUnit: "cm",
  weight: "",
  weightUnit: "kg",
  age: "",
  gender: "",
};

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

type Props = {
  onBack: () => void;
  onSaved: (message?: string) => void;
};

export function BasicInfoScreen({ onBack, onSaved }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const [form, setForm] = useState<BasicInfo>(DEFAULT_BASIC_INFO);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(readJsonStorage("bee_basic_info", DEFAULT_BASIC_INFO));
  }, []);

  const updateField = (key: keyof BasicInfo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const save = () => {
    const ageValue = form.age ? Number(form.age) : null;
    if (ageValue !== null && (!Number.isFinite(ageValue) || ageValue < 1 || ageValue > 120)) {
      setError("Age must be between 1 and 120.");
      return;
    }

    writeJsonStorage("bee_basic_info", form);
    onSaved("Saved successfully!");
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={23} color={PROFILE_GREEN} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          Basic Information
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
        <FieldBlock label="Height">
          <View style={styles.valueRow}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              value={form.height}
              onChangeText={(value) => updateField("height", value)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
            />
            <SegmentedToggle
              values={["cm", "ft"]}
              selected={form.heightUnit}
              onSelect={(value) => updateField("heightUnit", value)}
            />
          </View>
        </FieldBlock>

        <FieldBlock label="Weight">
          <View style={styles.valueRow}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              value={form.weight}
              onChangeText={(value) => updateField("weight", value)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
            />
            <SegmentedToggle
              values={["kg", "lb"]}
              selected={form.weightUnit}
              onSelect={(value) => updateField("weightUnit", value)}
            />
          </View>
        </FieldBlock>

        <FieldBlock label="Age">
          <TextInput
            style={[
              styles.fullInput,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            value={form.age}
            onChangeText={(value) => updateField("age", value)}
            keyboardType="numeric"
            placeholder="Years"
            placeholderTextColor={colors.mutedForeground}
            maxLength={3}
          />
        </FieldBlock>

        <FieldBlock label="Gender">
          <View style={styles.genderGrid}>
            {GENDERS.map((gender) => {
              const selected = form.gender === gender;
              return (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderPill,
                    {
                      backgroundColor: selected ? colors.vibrantGreen : colors.card,
                      borderColor: selected ? colors.vibrantGreen : colors.border,
                    },
                  ]}
                  onPress={() => updateField("gender", gender)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.genderText,
                      {
                        color: selected ? colors.accentForeground : colors.foreground,
                        fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {gender}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FieldBlock>

        {error ? (
          <Text style={[styles.errorText, { fontFamily: "Inter_500Medium" }]}>{error}</Text>
        ) : null}

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.9}>
          <Text style={[styles.saveText, { fontFamily: "Inter_700Bold" }]}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function SegmentedToggle({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
      {values.map((value) => {
        const isSelected = selected === value;
        return (
          <TouchableOpacity
            key={value}
            style={[styles.segment, isSelected && { backgroundColor: colors.vibrantGreen }]}
            onPress={() => onSelect(value)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: isSelected ? colors.accentForeground : colors.mutedForeground,
                  fontFamily: "Inter_600SemiBold",
                },
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        );
      })}
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
  content: { paddingHorizontal: 16, gap: 18 },
  desktopContent: { width: "100%", maxWidth: 760, alignSelf: "center" },
  fieldBlock: { gap: 10 },
  fieldLabel: { fontSize: 17 },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  fullInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  segmented: {
    width: 122,
    height: 44,
    borderRadius: 22,
    padding: 4,
    flexDirection: "row",
  },
  segment: {
    flex: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: { fontSize: 13, textTransform: "uppercase" },
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  genderPill: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  genderText: { fontSize: 14 },
  errorText: { color: "#D32F2F", fontSize: 13 },
  saveBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: PROFILE_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveText: { color: "#FFFFFF", fontSize: 17 },
});
