import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { clampSize, isDesktopWidth } from "@/lib/responsive";

type ScanState = "idle" | "detecting" | "result" | "error";

interface Ingredient {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ScanResult {
  isFood: boolean;
  dishName: string;
  ingredients: Ingredient[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

function getMealTypeFromHour(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "Breakfast";
  if (h < 14) return "Lunch";
  if (h < 18) return "Snack";
  return "Dinner";
}

export default function SnapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { todayScans, scanLimit, addScan } = useNutrition();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealType>(getMealTypeFromHour());

  const atLimit = scanLimit > 0 && todayScans >= scanLimit;
  const nearLimit = scanLimit > 0 && !atLimit && todayScans >= scanLimit * 0.8;
  const isMobile = width < 640;
  const isDesktop = isDesktopWidth(width);
  const imageHeight = clampSize(width * 0.58, 210, isDesktop ? 340 : 280);
  const bottomActionOffset = isMobile ? 170 : 100;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const pickImage = async (fromCamera: boolean) => {
    if (atLimit) {
      Alert.alert(
        "Daily limit reached",
        `You've used all ${scanLimit} scans for today. Update your limit in Goals & Usage.`,
        [{ text: "OK" }]
      );
      return;
    }
    let pickerResult: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Camera access is required to snap food.");
        return;
      }
      pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });
    } else {
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });
    }

    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

    const asset = pickerResult.assets[0];
    setImageUri(asset.uri);
    setScanState("detecting");
    setResult(null);
    setErrorMsg("");

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    await analyzeImage(asset.base64 ?? "", asset.mimeType ?? "image/jpeg", asset.uri);
  };

  const analyzeImage = async (base64: string, mimeType: string, uri: string) => {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "";
      const response = await fetch(`${baseUrl}/api/food/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await response.json();

      if (!response.ok || !data.isFood) {
        setScanState("error");
        setErrorMsg(
          data.error ||
            "No food detected. Please snap a picture of your meal or a packaged food item."
        );
        return;
      }

      setResult(data as ScanResult);
      setScanState("result");
      await addScan();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setScanState("error");
      setErrorMsg("Failed to analyze image. Please try again.");
    }
  };

  const handleLog = () => {
    if (!result) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.push({
      pathname: "/log-confirm",
      params: {
        result: JSON.stringify(result),
        mealType: selectedMeal,
        imageUri: imageUri ?? "",
        date: new Date().toISOString().split("T")[0],
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 12, backgroundColor: colors.darkGreen },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Snap Food
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopContent,
          {
            paddingBottom:
              Platform.OS === "web"
                ? 34 + bottomActionOffset
                : insets.bottom + bottomActionOffset,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Limit warning banner */}
        {(atLimit || nearLimit) && scanState === "idle" && (
          <View style={[styles.limitBanner, { backgroundColor: atLimit ? "#FFF3F3" : "#FFFBEB", borderColor: atLimit ? "#FFCDD2" : "#FFE082" }]}>
            <Feather name="alert-triangle" size={16} color={atLimit ? "#F44336" : "#F59E0B"} />
            <Text style={[styles.limitBannerText, { color: atLimit ? "#F44336" : "#92400E", fontFamily: "Inter_500Medium" }]}>
              {atLimit
                ? `Daily limit reached (${todayScans}/${scanLimit} scans). Update in Goals & Usage.`
                : `${todayScans}/${scanLimit} scans used today — almost at your limit.`}
            </Text>
          </View>
        )}

        {/* Tips */}
        {scanState === "idle" && (
          <View style={styles.tipsContainer}>
            <Text
              style={[
                styles.tipsTitle,
                { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
              ]}
            >
              Tips for better accuracy
            </Text>
            <View style={styles.tipsList}>
              {TIPS.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View
                    style={[
                      styles.tipIcon,
                      { backgroundColor: colors.paleGreen },
                    ]}
                  >
                    <Feather name={tip.icon as any} size={16} color={colors.vibrantGreen} />
                  </View>
                  <View style={styles.tipText}>
                    <Text
                      style={[
                        styles.tipLabel,
                        {
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                    >
                      {tip.title}
                    </Text>
                    <Text
                      style={[
                        styles.tipDesc,
                        {
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                        },
                      ]}
                    >
                      {tip.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Image Preview */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={[styles.foodImage, { height: imageHeight, borderRadius: 20 }]}
              resizeMode="cover"
            />
            {scanState === "detecting" && (
              <View style={[styles.scanOverlay, { borderRadius: 20 }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={[styles.detectingText, { fontFamily: "Inter_600SemiBold" }]}>
                  Detecting ingredients...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {scanState === "error" && (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: "#FFF3F3", borderColor: "#FFCDD2" },
            ]}
          >
            <Feather name="alert-circle" size={28} color={colors.fatRed} />
            <Text
              style={[
                styles.errorText,
                { color: colors.fatRed, fontFamily: "Inter_500Medium" },
              ]}
            >
              {errorMsg}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryBtn,
                { backgroundColor: colors.vibrantGreen },
              ]}
              onPress={() => {
                setScanState("idle");
                setImageUri(null);
              }}
            >
              <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {scanState === "result" && result && (
          <View style={styles.resultsContainer}>
            <Text
              style={[
                styles.dishName,
                { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
              ]}
            >
              {result.dishName}
            </Text>

            {/* Macro Cards 2x2 */}
            <View style={styles.macroGrid}>
              <MacroCard label="Calories" value={result.totals.calories} unit="kcal" color="#FF6B35" />
              <MacroCard label="Protein" value={result.totals.protein} unit="g" color="#2196F3" />
              <MacroCard label="Carbs" value={result.totals.carbs} unit="g" color="#FFC107" />
              <MacroCard label="Fat" value={result.totals.fat} unit="g" color="#F44336" />
            </View>

            {/* Ingredient Breakdown */}
            <View
              style={[
                styles.ingredientCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.ingredientTitle,
                  { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
                ]}
              >
                Ingredient breakdown
              </Text>
              {result.ingredients.map((ing, i) => (
                <View key={i}>
                  {i > 0 && (
                    <View
                      style={[styles.divider, { backgroundColor: colors.border }]}
                    />
                  )}
                  <View style={styles.ingredientRow}>
                    <View style={styles.ingredientInfo}>
                      <Text
                        style={[
                          styles.ingredientName,
                          {
                            color: colors.foreground,
                            fontFamily: "Inter_600SemiBold",
                          },
                        ]}
                      >
                        {ing.name}
                      </Text>
                      <Text
                        style={[
                          styles.ingredientServing,
                          {
                            color: colors.mutedForeground,
                            fontFamily: "Inter_400Regular",
                          },
                        ]}
                      >
                        {ing.serving}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.ingredientCal,
                        {
                          color: colors.calorieOrange,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                    >
                      {Math.round(ing.calories)} Cal
                    </Text>
                  </View>
                </View>
              ))}
              <View
                style={[styles.totalRow, { borderTopColor: colors.darkGreen }]}
              >
                <Text
                  style={[
                    styles.totalLabel,
                    { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    styles.totalCal,
                    { color: colors.darkGreen, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {Math.round(result.totals.calories)} Cal
                </Text>
              </View>
            </View>

            {/* Meal Type Selector */}
            <Text
              style={[
                styles.mealSelectorLabel,
                { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Log as
            </Text>
            <View style={styles.mealSelector}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal}
                  onPress={() => setSelectedMeal(meal)}
                  style={[
                    styles.mealPill,
                    {
                      backgroundColor:
                        selectedMeal === meal
                          ? colors.vibrantGreen
                          : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mealPillText,
                      {
                        color:
                          selectedMeal === meal
                            ? "#FFFFFF"
                            : colors.mutedForeground,
                        fontFamily:
                          selectedMeal === meal
                            ? "Inter_600SemiBold"
                            : "Inter_400Regular",
                      },
                    ]}
                  >
                    {meal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom:
              Platform.OS === "web" ? 34 : insets.bottom + 12,
          },
        ]}
      >
        {(scanState === "idle" || scanState === "error") && (
          <View style={[styles.captureButtons, isMobile && styles.mobileButtonStack]}>
            <TouchableOpacity
              style={[
                styles.captureBtn,
                isMobile && styles.mobileFullButton,
                { backgroundColor: colors.darkGreen },
              ]}
              onPress={() => pickImage(true)}
            >
              <Feather name="camera" size={20} color="#FFFFFF" />
              <Text style={[styles.captureBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Take Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.galleryBtn,
                isMobile && styles.mobileFullButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => pickImage(false)}
            >
              <Feather name="image" size={20} color={colors.darkGreen} />
              <Text
                style={[
                  styles.galleryBtnText,
                  { color: colors.darkGreen, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {scanState === "result" && (
          <View style={[styles.logButtons, isMobile && styles.mobileButtonStack]}>
            <TouchableOpacity
              style={[
                styles.editBtn,
                isMobile && styles.mobileFullButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => {
                setScanState("idle");
                setImageUri(null);
                setResult(null);
              }}
            >
              <Text
                style={[
                  styles.editBtnText,
                  { color: colors.darkGreen, fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Rescan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.logBtn,
                isMobile && styles.mobileFullButton,
                { backgroundColor: colors.vibrantGreen },
              ]}
              onPress={handleLog}
            >
              <Text style={[styles.logBtnText, { fontFamily: "Inter_700Bold" }]}>
                Log as {selectedMeal}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function MacroCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const valueSize = clampSize(width * 0.05, 29, 38);

  return (
    <View
      style={[
        macroCardStyles.card,
        {
          borderColor: colors.border,
          borderLeftColor: color,
          flexBasis: isDesktop ? "23%" : "48%",
          maxWidth: isDesktop ? "23%" : "48%",
        },
      ]}
    >
      <View>
        <Text
          style={[
            macroCardStyles.value,
            {
              color,
              fontFamily: "Inter_700Bold",
              fontSize: valueSize,
              lineHeight: valueSize + 4,
            },
          ]}
        >
          {Math.round(value)}
        </Text>
        <Text style={[macroCardStyles.unit, { fontFamily: "Inter_400Regular" }]}>
          {unit}
        </Text>
      </View>
      <Text style={[macroCardStyles.label, { fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
    </View>
  );
}

const macroCardStyles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 112,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-between",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  value: { fontWeight: "700" },
  unit: { fontSize: 12, color: "#6B7E76", lineHeight: 16 },
  label: { fontSize: 14, color: "#1B4332", marginTop: 8 },
});

const TIPS = [
  {
    icon: "aperture",
    title: "Side angle view",
    desc: "Take photos from the side for better ingredient visibility",
  },
  {
    icon: "eye-off",
    title: "Avoid top-down",
    desc: "Top-down photos hide depth and make portioning harder",
  },
  {
    icon: "package",
    title: "Barcode scanning",
    desc: "Point at the barcode for packaged foods for best accuracy",
  },
  {
    icon: "sun",
    title: "Good lighting",
    desc: "Natural light gives the best color accuracy for food",
  },
];

const styles = StyleSheet.create({
  limitBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  limitBannerText: { flex: 1, fontSize: 13, lineHeight: 19 },
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 20 },
  desktopContent: { width: "100%", maxWidth: 760, alignSelf: "center" },
  tipsContainer: { gap: 16 },
  tipsTitle: { fontSize: 18 },
  tipsList: { gap: 12 },
  tipRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tipText: { flex: 1, gap: 2 },
  tipLabel: { fontSize: 14 },
  tipDesc: { fontSize: 12 },
  imageContainer: { borderRadius: 20, overflow: "hidden" },
  foodImage: { width: "100%" },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(27,67,50,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  detectingText: { color: "#FFFFFF", fontSize: 16 },
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  errorText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, justifyContent: "center" },
  retryText: { color: "#FFFFFF", fontSize: 15 },
  resultsContainer: { gap: 16 },
  dishName: { fontSize: 22, lineHeight: 28 },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  ingredientCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  ingredientTitle: { fontSize: 16, padding: 16, paddingBottom: 12 },
  divider: { height: 1, marginHorizontal: 16 },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingVertical: 12,
  },
  ingredientInfo: { flex: 1, gap: 2 },
  ingredientName: { fontSize: 14 },
  ingredientServing: { fontSize: 12 },
  ingredientCal: { fontSize: 14 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    paddingVertical: 14,
    borderTopWidth: 2,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15 },
  totalCal: { fontSize: 15 },
  mealSelectorLabel: { fontSize: 14 },
  mealSelector: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  mealPill: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    justifyContent: "center",
  },
  mealPillText: { fontSize: 14 },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  captureButtons: { flexDirection: "row", gap: 10 },
  mobileButtonStack: { flexDirection: "column" },
  mobileFullButton: { flex: 0 },
  captureBtn: {
    flex: 1,
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  captureBtnText: { color: "#FFFFFF", fontSize: 16 },
  galleryBtn: {
    flex: 1,
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },
  galleryBtnText: { fontSize: 16 },
  logButtons: { flexDirection: "row", gap: 10 },
  editBtn: {
    flex: 1,
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 16 },
  logBtn: {
    flex: 2,
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
  },
  logBtnText: { color: "#FFFFFF", fontSize: 16 },
});
