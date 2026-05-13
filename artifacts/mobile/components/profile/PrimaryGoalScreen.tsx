import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
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

import { useColors } from "@/hooks/useColors";
import { isDesktopWidth } from "@/lib/responsive";

import { PROFILE_GREEN, readJsonStorage, writeJsonStorage } from "./storage";

type BasicInfo = {
  height?: string;
  heightUnit?: "cm" | "ft";
  weight?: string;
  weightUnit?: "kg" | "lb";
};

type SavedGoal = {
  goalType: string;
  targetWeight: number | null;
  targetWeightUnit: "Kg" | "Lb";
  pace: number | null;
  savedAt: string;
};

type Props = {
  onBack: () => void;
  onSaved: (message?: string) => void;
};

const GOAL_TYPES = ["Lose Weight", "Maintain Weight", "Gain Weight"];
const WHOLE_WEIGHTS = Array.from({ length: 171 }, (_, index) => 30 + index);
const DECIMALS = Array.from({ length: 10 }, (_, index) => index);
const ITEM_HEIGHT = 48;

export function PrimaryGoalScreen({ onBack, onSaved }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goalType, setGoalType] = useState("");
  const [targetWhole, setTargetWhole] = useState(70);
  const [targetDecimal, setTargetDecimal] = useState(0);
  const [targetWeightUnit, setTargetWeightUnit] = useState<"Kg" | "Lb">("Kg");
  const [pace, setPace] = useState(0.5);
  const basicInfo = readJsonStorage<BasicInfo>("bee_basic_info", {});

  useEffect(() => {
    const savedGoal = readJsonStorage<SavedGoal | null>("bee_goal", null);
    if (!savedGoal) return;
    setGoalType(savedGoal.goalType ?? "");
    setTargetWeightUnit(savedGoal.targetWeightUnit ?? "Kg");
    setPace(savedGoal.pace ?? 0.5);
    if (typeof savedGoal.targetWeight === "number") {
      const whole = Math.floor(savedGoal.targetWeight);
      const decimal = Math.round((savedGoal.targetWeight - whole) * 10);
      setTargetWhole(Math.min(Math.max(whole, 30), 200));
      setTargetDecimal(Math.min(Math.max(decimal, 0), 9));
    }
  }, []);

  const targetWeight = Number((targetWhole + targetDecimal / 10).toFixed(1));

  const saveGoal = (override?: Partial<SavedGoal>) => {
    const goal: SavedGoal = {
      goalType,
      targetWeight,
      targetWeightUnit,
      pace,
      savedAt: new Date().toISOString(),
      ...override,
    };
    writeJsonStorage("bee_goal", goal);
    onSaved("Goal saved!");
  };

  const continueFromGoalType = () => {
    if (!goalType) return;
    if (goalType === "Maintain Weight") {
      saveGoal({ targetWeight: null, pace: null });
      return;
    }
    setStep(2);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={23} color={PROFILE_GREEN} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          Primary Goal
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
        {step === 1 ? (
          <GoalTypeStep
            selected={goalType}
            onSelect={setGoalType}
            onNext={continueFromGoalType}
          />
        ) : null}
        {step === 2 ? (
          <TargetWeightStep
            basicInfo={basicInfo}
            targetWhole={targetWhole}
            targetDecimal={targetDecimal}
            targetWeightUnit={targetWeightUnit}
            onWholeChange={setTargetWhole}
            onDecimalChange={setTargetDecimal}
            onUnitChange={setTargetWeightUnit}
            onNext={() => setStep(3)}
          />
        ) : null}
        {step === 3 ? (
          <GoalPaceStep
            basicInfo={basicInfo}
            targetWeight={targetWeight}
            targetWeightUnit={targetWeightUnit}
            pace={pace}
            onPaceChange={setPace}
            onSave={() => saveGoal()}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function GoalTypeStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: string;
  onSelect: (value: string) => void;
  onNext: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.stepTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
        What's your primary goal?
      </Text>
      <View style={styles.goalCards}>
        {GOAL_TYPES.map((goal) => {
          const isSelected = selected === goal;
          return (
            <TouchableOpacity
              key={goal}
              style={[
                styles.goalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? PROFILE_GREEN : colors.border,
                },
              ]}
              onPress={() => onSelect(goal)}
              activeOpacity={0.88}
            >
              <View style={[styles.goalIcon, { backgroundColor: isSelected ? PROFILE_GREEN : colors.muted }]}>
                <Feather name={isSelected ? "check" : "target"} size={20} color={isSelected ? "#FFFFFF" : PROFILE_GREEN} />
              </View>
              <Text
                style={[
                  styles.goalText,
                  { color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
              >
                {goal}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, !selected && styles.disabledBtn]}
        onPress={onNext}
        disabled={!selected}
        activeOpacity={0.9}
      >
        <Text style={[styles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

function TargetWeightStep({
  basicInfo,
  targetWhole,
  targetDecimal,
  targetWeightUnit,
  onWholeChange,
  onDecimalChange,
  onUnitChange,
  onNext,
}: {
  basicInfo: BasicInfo;
  targetWhole: number;
  targetDecimal: number;
  targetWeightUnit: "Kg" | "Lb";
  onWholeChange: (value: number) => void;
  onDecimalChange: (value: number) => void;
  onUnitChange: (value: "Kg" | "Lb") => void;
  onNext: () => void;
}) {
  const colors = useColors();
  const idealRange = getIdealWeightRange(basicInfo);
  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.stepTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
        What's your target weight?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Set a realistic weight goal for yourself.
      </Text>
      <View style={[styles.infoBanner, { backgroundColor: "#E7F5EC" }]}>
        <Feather name="info" size={16} color={PROFILE_GREEN} />
        <Text style={[styles.infoText, { color: PROFILE_GREEN, fontFamily: "Inter_500Medium" }]}>
          {idealRange
            ? `Your target weight is perfectly aligned with your ideal weight range of ${idealRange[0]}-${idealRange[1]} Kg.`
            : "Add your height in Basic Information to see your ideal weight range."}
        </Text>
      </View>

      <WeightPicker
        whole={targetWhole}
        decimal={targetDecimal}
        onWholeChange={onWholeChange}
        onDecimalChange={onDecimalChange}
      />

      <View style={[styles.unitToggle, { backgroundColor: colors.muted }]}>
        {(["Kg", "Lb"] as const).map((unit) => {
          const selected = targetWeightUnit === unit;
          return (
            <TouchableOpacity
              key={unit}
              style={[styles.unitPill, selected && { backgroundColor: PROFILE_GREEN }]}
              onPress={() => onUnitChange(unit)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.unitText,
                  { color: selected ? "#FFFFFF" : colors.mutedForeground, fontFamily: "Inter_700Bold" },
                ]}
              >
                {unit}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onNext} activeOpacity={0.9}>
        <Text style={[styles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

function GoalPaceStep({
  basicInfo,
  targetWeight,
  targetWeightUnit,
  pace,
  onPaceChange,
  onSave,
}: {
  basicInfo: BasicInfo;
  targetWeight: number;
  targetWeightUnit: "Kg" | "Lb";
  pace: number;
  onPaceChange: (value: number) => void;
  onSave: () => void;
}) {
  const colors = useColors();
  const timeline = getTimelineText(basicInfo, targetWeight, targetWeightUnit, pace);
  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.stepTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
        How fast do you want to reach your goal?
      </Text>

      <View style={styles.paceDisplay}>
        <Text style={[styles.paceValue, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          {formatPace(pace)} kg
        </Text>
        <Text style={[styles.paceUnit, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          per week
        </Text>
      </View>

      <PaceSlider value={pace} onChange={onPaceChange} />

      <Text style={[styles.tipText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        {getPaceTip(pace)}
      </Text>

      <View style={[styles.timelineBox, { backgroundColor: colors.muted }]}>
        <Text style={[styles.timelineText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
          {timeline}
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onSave} activeOpacity={0.9}>
        <Text style={[styles.primaryBtnText, { fontFamily: "Inter_700Bold" }]}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function WeightPicker({
  whole,
  decimal,
  onWholeChange,
  onDecimalChange,
}: {
  whole: number;
  decimal: number;
  onWholeChange: (value: number) => void;
  onDecimalChange: (value: number) => void;
}) {
  const colors = useColors();
  const wholeRef = useRef<ScrollView>(null);
  const decimalRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      wholeRef.current?.scrollTo({ y: (whole - 30) * ITEM_HEIGHT, animated: false });
      decimalRef.current?.scrollTo({ y: decimal * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const onWholeScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(Math.max(Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0), WHOLE_WEIGHTS.length - 1);
    onWholeChange(WHOLE_WEIGHTS[index]);
  };

  const onDecimalScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(Math.max(Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0), DECIMALS.length - 1);
    onDecimalChange(DECIMALS[index]);
  };

  return (
    <View style={styles.pickerWrap}>
      <View style={[styles.pickerHighlight, { borderColor: colors.border }]} />
      <ScrollView
        ref={wholeRef}
        style={styles.pickerColumn}
        contentContainerStyle={styles.pickerContent}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onWholeScrollEnd}
      >
        {WHOLE_WEIGHTS.map((value) => (
          <PickerItem key={value} label={String(value)} selected={value === whole} />
        ))}
      </ScrollView>
      <Text style={[styles.pickerDot, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>.</Text>
      <ScrollView
        ref={decimalRef}
        style={styles.pickerColumn}
        contentContainerStyle={styles.pickerContent}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={onDecimalScrollEnd}
      >
        {DECIMALS.map((value) => (
          <PickerItem key={value} label={String(value)} selected={value === decimal} />
        ))}
      </ScrollView>
    </View>
  );
}

function PickerItem({ label, selected }: { label: string; selected: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.pickerItem}>
      <Text
        style={[
          styles.pickerItemText,
          {
            color: selected ? colors.darkGreen : colors.mutedForeground,
            opacity: selected ? 1 : 0.38,
            fontFamily: selected ? "Inter_700Bold" : "Inter_500Medium",
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function PaceSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const colors = useColors();
  const [trackWidth, setTrackWidth] = useState(1);
  const percentage = ((value - 0.25) / 0.75) * 100;

  const setFromX = (x: number) => {
    const ratio = Math.min(Math.max(x / trackWidth, 0), 1);
    const raw = 0.25 + ratio * 0.75;
    onChange(Math.round(raw / 0.25) * 0.25);
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
    <View style={styles.sliderArea}>
      <View
        {...panResponder.panHandlers}
        style={[styles.sliderTrack, { backgroundColor: colors.border }]}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width || 1)}
      >
        <View style={[styles.sliderFill, { width: `${percentage}%` as any, backgroundColor: PROFILE_GREEN }]} />
        <View style={[styles.sliderThumb, { left: `${percentage}%` as any, backgroundColor: PROFILE_GREEN }]} />
      </View>
      <View style={styles.sliderLabels}>
        {[0.25, 0.5, 0.75, 1.0].map((label) => (
          <Text key={label} style={[styles.sliderLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {formatPace(label)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function getIdealWeightRange(info: BasicInfo) {
  const height = Number(info.height);
  if (!height || !Number.isFinite(height) || height <= 0) return null;
  const meters = info.heightUnit === "ft" ? height * 0.3048 : height / 100;
  if (!meters || meters <= 0) return null;
  const min = Math.round(18.5 * meters * meters);
  const max = Math.round(24.9 * meters * meters);
  return [min, max] as const;
}

function getCurrentWeightKg(info: BasicInfo) {
  const weight = Number(info.weight);
  if (!weight || !Number.isFinite(weight) || weight <= 0) return null;
  return info.weightUnit === "lb" ? weight * 0.453592 : weight;
}

function getTimelineText(info: BasicInfo, targetWeight: number, targetWeightUnit: "Kg" | "Lb", pace: number) {
  const currentWeightKg = getCurrentWeightKg(info);
  if (currentWeightKg === null) {
    return "Set your current weight in Basic Information to see your timeline.";
  }
  const targetKg = targetWeightUnit === "Lb" ? targetWeight * 0.453592 : targetWeight;
  const months = Math.round(Math.abs(currentWeightKg - targetKg) / (pace * 4.33));
  return `You will reach your goal in ${months} month${months === 1 ? "" : "s"}.`;
}

function getPaceTip(value: number) {
  if (value === 0.25) return "A gentle pace. Sustainable and healthy.";
  if (value === 0.5) return "This is a good pace, but you would need to work a bit harder.";
  if (value === 0.75) return "A challenging pace. Requires dedication.";
  return "Very aggressive. Consult a nutritionist.";
}

function formatPace(value: number) {
  return value === 1 ? "1.0" : String(value);
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
  content: { paddingHorizontal: 16 },
  desktopContent: { width: "100%", maxWidth: 760, alignSelf: "center" },
  stepWrap: { gap: 18 },
  stepTitle: { fontSize: 24, lineHeight: 30 },
  stepSubtitle: { fontSize: 14, lineHeight: 20, marginTop: -8 },
  goalCards: { gap: 12 },
  goalCard: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  goalText: { fontSize: 17 },
  primaryBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: PROFILE_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  disabledBtn: { opacity: 0.45 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 17 },
  infoBanner: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  pickerWrap: {
    height: ITEM_HEIGHT * 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pickerHighlight: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  pickerColumn: { width: 96, height: ITEM_HEIGHT * 5 },
  pickerContent: { paddingVertical: ITEM_HEIGHT * 2 },
  pickerItem: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  pickerItemText: { fontSize: 28 },
  pickerDot: { fontSize: 34, lineHeight: 40, width: 20, textAlign: "center" },
  unitToggle: {
    width: 164,
    height: 46,
    borderRadius: 23,
    padding: 4,
    flexDirection: "row",
    alignSelf: "center",
  },
  unitPill: {
    flex: 1,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  unitText: { fontSize: 14 },
  paceDisplay: { alignItems: "center", gap: 2, marginTop: 6 },
  paceValue: { fontSize: 44, lineHeight: 50 },
  paceUnit: { fontSize: 14 },
  sliderArea: { gap: 12, paddingHorizontal: 6 },
  sliderTrack: {
    height: 10,
    borderRadius: 5,
    justifyContent: "center",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 10,
    borderRadius: 5,
  },
  sliderThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabel: { fontSize: 12 },
  tipText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  timelineBox: { borderRadius: 14, padding: 14 },
  timelineText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
