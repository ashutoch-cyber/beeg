import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
}

export function CalorieRing({ consumed, goal, size = 200 }: CalorieRingProps) {
  const colors = useColors();
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;

  const remaining = Math.max(goal - consumed, 0);
  const isOver = consumed > goal;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.muted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={isOver ? colors.calorieOrange : colors.vibrantGreen}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.content}>
        <Text style={[styles.consumed, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          {Math.round(consumed)}
        </Text>
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          of {goal} Cal
        </Text>
        <View style={[styles.remainingBadge, { backgroundColor: colors.paleGreen }]}>
          <Text style={[styles.remainingText, { color: colors.vibrantGreen, fontFamily: "Inter_600SemiBold" }]}>
            {isOver ? `+${Math.round(consumed - goal)} over` : `${Math.round(remaining)} left`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 2,
  },
  consumed: {
    fontSize: 42,
    lineHeight: 48,
  },
  label: {
    fontSize: 13,
  },
  remainingBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  remainingText: {
    fontSize: 12,
  },
});
