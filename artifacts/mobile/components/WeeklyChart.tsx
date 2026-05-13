import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { clampSize, isDesktopWidth } from "@/lib/responsive";

type Metric = "calories" | "protein" | "carbs" | "fat";

const METRICS: { key: Metric; label: string }[] = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getPast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export function WeeklyChart() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { logs, goals } = useNutrition();
  const [metric, setMetric] = useState<Metric>("calories");
  const isDesktop = isDesktopWidth(width);

  const days = getPast7Days();

  const dailyTotals = days.map((date) => {
    const dayLogs = logs.filter((l) => l.date === date);
    return dayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.totals.calories,
        protein: acc.protein + log.totals.protein,
        carbs: acc.carbs + log.totals.carbs,
        fat: acc.fat + log.totals.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  });

  const goal = goals[metric];
  const values = dailyTotals.map((d) => d[metric]);
  const maxVal = Math.max(...values, goal * 1.15, 1);

  const metricColor: Record<Metric, string> = {
    calories: colors.vibrantGreen,
    protein: colors.proteinBlue,
    carbs: colors.carbsYellow,
    fat: colors.fatRed,
  };
  const barColor = metricColor[metric];

  const CHART_WIDTH = Math.round(
    clampSize(width - (isDesktop ? 104 : 72), 260, isDesktop ? 640 : 520),
  );
  const CHART_HEIGHT = isDesktop ? 150 : 130;
  const BAR_GAP = 6;
  const BAR_WIDTH = (CHART_WIDTH - BAR_GAP * 8) / 7;
  const LABEL_HEIGHT = 20;
  const PLOT_HEIGHT = CHART_HEIGHT - LABEL_HEIGHT;

  const goalY = PLOT_HEIGHT - (goal / maxVal) * PLOT_HEIGHT;
  const goalLineSegments = Array.from(
    { length: Math.ceil(CHART_WIDTH / 8) + 1 },
    (_, index) => index * 8,
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
        7-Day Trend
      </Text>

      {/* Metric toggle */}
      <View style={[styles.toggleRow, { backgroundColor: colors.muted }]}>
        {METRICS.map((m) => {
          const active = m.key === metric;
          return (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.toggleBtn,
                active && { backgroundColor: colors.card, shadowColor: "#000" },
              ]}
              onPress={() => setMetric(m.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: active ? metricColor[m.key] : colors.mutedForeground,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Goal dashed line */}
          {goalLineSegments.map((x) => (
            <Line
              key={x}
              x1={x}
              y1={goalY}
              x2={Math.min(x + 4, CHART_WIDTH)}
              y2={goalY}
              stroke={barColor}
              strokeWidth={1.5}
              strokeOpacity={0.45}
            />
          ))}

          {days.map((date, i) => {
            const val = values[i];
            const barH = Math.max((val / maxVal) * PLOT_HEIGHT, val > 0 ? 4 : 0);
            const x = BAR_GAP / 2 + i * (BAR_WIDTH + BAR_GAP);
            const y = PLOT_HEIGHT - barH;
            const isOver = val > goal;
            const dayOfWeek = new Date(date + "T12:00:00").getDay();
            const isToday = i === 6;

            return (
              <React.Fragment key={date}>
                {/* Bar background */}
                <Rect
                  x={x}
                  y={0}
                  width={BAR_WIDTH}
                  height={PLOT_HEIGHT}
                  rx={6}
                  fill={colors.muted}
                  fillOpacity={0.5}
                />
                {/* Value bar */}
                {val > 0 && (
                  <Rect
                    x={x}
                    y={y}
                    width={BAR_WIDTH}
                    height={barH}
                    rx={6}
                    fill={isOver ? colors.calorieOrange : barColor}
                    fillOpacity={isToday ? 1 : 0.72}
                  />
                )}
                {/* Day label */}
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={PLOT_HEIGHT + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill={isToday ? colors.darkGreen : colors.mutedForeground}
                  fontWeight={isToday ? "700" : "400"}
                >
                  {isToday ? "Today" : DAY_LABELS[dayOfWeek]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Goal legend */}
      <View style={styles.legend}>
        <View style={[styles.legendDash, { backgroundColor: barColor }]} />
        <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Daily goal: {goal}{metric === "calories" ? " kcal" : "g"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
  },
  toggleRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 12,
    textAlign: "center",
  },
  chartContainer: {
    alignItems: "center",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDash: {
    width: 16,
    height: 2,
    borderRadius: 1,
    opacity: 0.45,
  },
  legendText: {
    fontSize: 12,
  },
});
