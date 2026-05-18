import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import palette from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

interface Props {
  streak: number;
  bestStreak: number;
  weekLoggedDays: boolean[];
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getMotivation(streak: number): string {
  if (streak === 0) return "Log a meal today to start your streak!";
  if (streak === 1) return "Great start — keep it going!";
  if (streak < 3) return "Building momentum 💪";
  if (streak < 7) return "You're on a roll!";
  if (streak < 14) return "One week strong 🔥";
  if (streak < 30) return "Absolutely crushing it!";
  if (streak < 60) return "One month? You're unstoppable!";
  return "Legendary dedication! 🏆";
}

function getMilestoneLabel(streak: number): string | null {
  const milestones = [3, 7, 14, 21, 30, 60, 90, 100];
  const next = milestones.find((m) => m > streak);
  if (!next) return null;
  const diff = next - streak;
  return diff === 1
    ? `1 day to ${next}-day milestone!`
    : `${diff} days to ${next}-day milestone`;
}

// Individual dot as its own component to avoid hooks-in-loop
function WeekDot({
  logged,
  label,
  delay,
}: {
  logged: boolean;
  label: string;
  delay: number;
}) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(logged ? 1 : 0.8, { damping: 10, stiffness: 200 })
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }, [logged]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.dotCol}>
      <Animated.View
        style={[
          styles.dot,
          dotStyle,
          {
            backgroundColor: logged ? palette.light.highlightGreen : palette.light.whiteOverlay18,
            borderWidth: logged ? 0 : 1,
            borderColor: palette.light.whiteOverlay25,
          },
        ]}
      />
      <Text
        style={[
          styles.dotLabel,
          {
            color: logged ? palette.light.whiteOverlay90 : palette.light.whiteOverlay35,
            fontFamily: logged ? "Inter_700Bold" : "Inter_400Regular",
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function StreakCard({ streak, bestStreak, weekLoggedDays }: Props) {
  const colors = useColors();

  // ── Count-up animation ──────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(0);
  const activeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (activeTimer.current) clearInterval(activeTimer.current);
    if (streak === 0) { setDisplayCount(0); return; }
    const end = streak;
    const duration = Math.min(1000, end * 100);
    const steps = end;
    const interval = Math.max(duration / steps, 30);
    let current = 0;
    setDisplayCount(0);
    activeTimer.current = setInterval(() => {
      current += 1;
      setDisplayCount(current);
      if (current >= end) {
        clearInterval(activeTimer.current!);
        activeTimer.current = null;
      }
    }, interval);
    return () => { if (activeTimer.current) clearInterval(activeTimer.current); };
  }, [streak]);

  // ── Entry slide-up ───────────────────────────────────────────────
  const cardY = useSharedValue(50);
  const cardOpacity = useSharedValue(0);
  useEffect(() => {
    cardY.value = withSpring(0, { damping: 14, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 600 });
  }, []);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
    opacity: cardOpacity.value,
  }));

  // ── Flame pulse + sway ──────────────────────────────────────────
  const flameScale = useSharedValue(1);
  const flameRot = useSharedValue(0);
  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 550, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 550, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    flameRot.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 380, easing: Easing.inOut(Easing.sin) }),
        withTiming(9, { duration: 760, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 380, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }, { rotate: `${flameRot.value}deg` }],
  }));

  // ── Glow halo ───────────────────────────────────────────────────
  const glowScale = useSharedValue(0.7);
  const glowOpacity = useSharedValue(0.4);
  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.8, { duration: 850, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 850 }),
        withTiming(0.5, { duration: 850 })
      ),
      -1,
      false
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  // ── Number pop on streak change ─────────────────────────────────
  const numScale = useSharedValue(1);
  useEffect(() => {
    numScale.value = withSequence(
      withSpring(1.45, { damping: 5, stiffness: 350 }),
      withSpring(1.0, { damping: 14, stiffness: 180 })
    );
  }, [streak]);
  const numStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numScale.value }],
  }));

  const flameColor = streak === 0 ? colors.mutedText : colors.streakLightning;
  const milestoneLabel = getMilestoneLabel(streak);

  return (
    <Animated.View style={[styles.wrapper, cardStyle]}>
      <View style={[styles.card, { backgroundColor: colors.darkGreen }]}>
        {/* Best streak chip */}
        <View style={styles.bestChip}>
          <Feather name="award" size={11} color={colors.streakLightning} />
          <Text style={[styles.bestChipText, { fontFamily: "Inter_500Medium" }]}>
            Best: {bestStreak}d
          </Text>
        </View>

        {/* Main row */}
        <View style={styles.mainRow}>
          {/* Flame */}
          <View style={styles.flameWrap}>
            <Animated.View
              style={[
                styles.glowHalo,
                { backgroundColor: flameColor },
                glowStyle,
              ]}
            />
            <Animated.View style={flameStyle}>
              <Text style={styles.flameEmoji}>
                {streak === 0 ? "💤" : streak < 3 ? "⚡" : "🔥"}
              </Text>
            </Animated.View>
          </View>

          {/* Count */}
          <View style={styles.countWrap}>
            <Animated.Text
              style={[
                styles.streakNum,
                { color: colors.whiteTextOnGreen, fontFamily: "Inter_700Bold" },
                numStyle,
              ]}
            >
              {displayCount}
            </Animated.Text>
            <Text
              style={[
                styles.streakLabel,
                {
                  color: colors.whiteOverlay70,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              day streak
            </Text>
          </View>

          {/* Week dots */}
          <View style={styles.dotsWrap}>
            <Text
              style={[
                styles.dotsTitle,
                {
                  color: colors.whiteOverlay55,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              This week
            </Text>
            <View style={styles.dotsRow}>
              {weekLoggedDays.map((logged, i) => (
                <WeekDot
                  key={i}
                  logged={logged}
                  label={DAY_LABELS[i]}
                  delay={i * 55}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Motivation footer */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              {
                color: colors.whiteOverlay75,
                fontFamily: "Inter_400Regular",
              },
            ]}
          >
            {milestoneLabel ?? getMotivation(streak)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16 },
  card: { borderRadius: 20, overflow: "hidden" },
  bestChip: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: palette.light.whiteOverlay12,
  },
  bestChipText: { color: palette.light.streakLightning, fontSize: 11 },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 0,
  },
  flameWrap: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  glowHalo: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  flameEmoji: { fontSize: 40 },
  countWrap: { flex: 1, alignItems: "center", gap: 1 },
  streakNum: { fontSize: 50, lineHeight: 54 },
  streakLabel: { fontSize: 12 },
  dotsWrap: { width: 110, alignItems: "flex-end", gap: 6 },
  dotsTitle: { fontSize: 10 },
  dotsRow: { flexDirection: "row", gap: 5 },
  dotCol: { alignItems: "center", gap: 3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLabel: { fontSize: 8 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: palette.light.whiteOverlay10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerText: { fontSize: 12, textAlign: "center" },
});
