import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, current, goal, unit = "g", color }: MacroBarProps) {
  const colors = useColors();
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isOver = current > goal;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.bodyText, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
        <Text style={[styles.values, { color: isOver ? colors.highlightGreen : colors.mutedText, fontFamily: "Inter_400Regular" }]}>
          {Math.round(current)}{unit}{" / "}
          <Text style={{ color: colors.mutedText }}>{goal}{unit}</Text>
          {isOver && (
            <Text style={[{ color: colors.highlightGreen }, { fontFamily: "Inter_600SemiBold" }]}>
              {" "}({Math.round((current / goal) * 100)}%)
            </Text>
          )}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.lightAccentGreen }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%` as `${number}%`,
              backgroundColor: colors.highlightGreen,
              borderRadius: 4,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 13,
    flexShrink: 0,
  },
  values: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
    textAlign: "right",
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
