import { router } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function SummaryTabScreen() {
  const colors = useColors();

  useEffect(() => {
    router.replace("/(tabs)");
    const timer = setTimeout(() => {
      router.push("/weekly-summary");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return <View style={[styles.screen, { backgroundColor: colors.background }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
