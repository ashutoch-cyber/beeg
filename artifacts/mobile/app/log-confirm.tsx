import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Image,
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
import palette from "@/constants/colors";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { clampSize, isDesktopWidth } from "@/lib/responsive";

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type MealTypeKey = "breakfast" | "lunch" | "dinner" | "snack";

interface Ingredient {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface EditValues {
  name: string;
  serving: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

function toMealTypeKey(mealType: MealType): MealTypeKey {
  return mealType.toLowerCase() as MealTypeKey;
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toEditValues(ingredient: Ingredient): EditValues {
  return {
    name: ingredient.name,
    serving: ingredient.serving,
    calories: String(ingredient.calories ?? 0),
    protein: String(ingredient.protein ?? 0),
    carbs: String(ingredient.carbs ?? 0),
    fat: String(ingredient.fat ?? 0),
  };
}

function normalizeIngredient(ingredient: Partial<Ingredient>): Ingredient {
  return {
    name: ingredient.name ?? "",
    serving: ingredient.serving ?? "",
    calories: toNumber(ingredient.calories),
    protein: toNumber(ingredient.protein),
    carbs: toNumber(ingredient.carbs),
    fat: toNumber(ingredient.fat),
  };
}

function editValuesToIngredient(values: EditValues): Ingredient {
  return {
    name: values.name.trim(),
    serving: values.serving.trim(),
    calories: toNumber(values.calories),
    protein: toNumber(values.protein),
    carbs: toNumber(values.carbs),
    fat: toNumber(values.fat),
  };
}

export default function LogConfirmScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { addLog } = useNutrition();
  const params = useLocalSearchParams<{
    result: string;
    mealType: string;
    imageUri: string;
    date: string;
  }>();

  const result = useMemo(() => (params.result ? JSON.parse(params.result) : null), [params.result]);
  const mealType = (params.mealType ?? "Lunch") as MealType;
  const imageUri = params.imageUri || undefined;
  const date = params.date ?? new Date().toISOString().split("T")[0];
  const initialIngredients = useMemo(
    () => ((result?.ingredients ?? []) as Partial<Ingredient>[]).map(normalizeIngredient),
    [result],
  );
  const initialDishName = result?.dishName ?? "";
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [newIngredientIndex, setNewIngredientIndex] = useState(-1);
  const [editValues, setEditValues] = useState<EditValues>({
    name: "",
    serving: "",
    calories: "0",
    protein: "0",
    carbs: "0",
    fat: "0",
  });
  const [dishName, setDishName] = useState(initialDishName);
  const [dishNameDraft, setDishNameDraft] = useState(initialDishName);
  const [editingDishName, setEditingDishName] = useState(false);
  const confirmingDishName = useRef(false);

  const totalCalories = ingredients.reduce(
    (sum, item) => sum + (Number(item.calories) || 0),
    0
  );
  const totalProtein = ingredients.reduce(
    (sum, item) => sum + (Number(item.protein) || 0),
    0
  );
  const totalCarbs = ingredients.reduce(
    (sum, item) => sum + (Number(item.carbs) || 0),
    0
  );
  const totalFat = ingredients.reduce(
    (sum, item) => sum + (Number(item.fat) || 0),
    0
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const isMobile = width < 640;
  const isDesktop = isDesktopWidth(width);
  const macroValueSize = clampSize(width * 0.05, 29, 38);
  const imageHeight = clampSize(width * 0.52, 190, isDesktop ? 320 : 260);
  const bottomActionOffset = isMobile ? 170 : 100;

  const saveCurrentIngredientEdit = () => {
    if (editingIndex < 0) return;

    const updatedIngredient = editValuesToIngredient(editValues);
    setIngredients((current) =>
      current.map((ingredient, index) =>
        index === editingIndex ? updatedIngredient : ingredient
      )
    );
    setNewIngredientIndex(-1);
  };

  const beginDishNameEdit = () => {
    setDishNameDraft(dishName);
    setEditingDishName(true);
  };

  const confirmDishNameEdit = () => {
    confirmingDishName.current = true;
    setDishName(dishNameDraft.trim() || dishName);
    setEditingDishName(false);
  };

  const beginIngredientEdit = (index: number) => {
    if (editingIndex >= 0 && editingIndex !== index) {
      saveCurrentIngredientEdit();
    }

    setEditValues(toEditValues(ingredients[index]));
    setEditingIndex(index);
  };

  const saveIngredientEdit = () => {
    saveCurrentIngredientEdit();
    setEditingIndex(-1);
  };

  const cancelIngredientEdit = () => {
    if (editingIndex === newIngredientIndex) {
      setIngredients((current) => current.filter((_, index) => index !== editingIndex));
    }

    setEditingIndex(-1);
    setNewIngredientIndex(-1);
  };

  const deleteIngredient = (index: number) => {
    setIngredients((current) => current.filter((_, currentIndex) => currentIndex !== index));
    if (editingIndex === index) {
      setEditingIndex(-1);
      setNewIngredientIndex(-1);
    } else if (editingIndex > index) {
      setEditingIndex((current) => current - 1);
    }

    if (newIngredientIndex === index) {
      setNewIngredientIndex(-1);
    } else if (newIngredientIndex > index) {
      setNewIngredientIndex((current) => current - 1);
    }
  };

  const addIngredient = () => {
    if (editingIndex >= 0) {
      saveCurrentIngredientEdit();
    }

    const blankIngredient = normalizeIngredient({});
    setIngredients((current) => {
      const nextIndex = current.length;
      setEditingIndex(nextIndex);
      setNewIngredientIndex(nextIndex);
      return [...current, blankIngredient];
    });
    setEditValues(toEditValues(blankIngredient));
  };

  const handleConfirm = async () => {
    if (!result) return;
    let finalIngredients = ingredients;
    if (editingIndex >= 0) {
      const updatedIngredient = editValuesToIngredient(editValues);
      finalIngredients = ingredients.map((ingredient, index) =>
        index === editingIndex ? updatedIngredient : ingredient
      );
      setIngredients(finalIngredients);
      setEditingIndex(-1);
      setNewIngredientIndex(-1);
    }
    const finalDishName = editingDishName ? dishNameDraft.trim() || dishName : dishName;
    const finalCalories = finalIngredients.reduce(
      (sum, item) => sum + (Number(item.calories) || 0),
      0
    );
    const finalProtein = finalIngredients.reduce(
      (sum, item) => sum + (Number(item.protein) || 0),
      0
    );
    const finalCarbs = finalIngredients.reduce(
      (sum, item) => sum + (Number(item.carbs) || 0),
      0
    );
    const finalFat = finalIngredients.reduce(
      (sum, item) => sum + (Number(item.fat) || 0),
      0
    );

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await addLog({
      date,
      meal_type: toMealTypeKey(mealType),
      dish_name: finalDishName,
      image_uri: imageUri ?? null,
      calories: finalCalories,
      protein: finalProtein,
      carbs: finalCarbs,
      fat: finalFat,
      ingredients: finalIngredients,
      totals: {
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fat: finalFat,
      },
    });
    router.replace("/(tabs)");
  };

  if (!result) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>No data</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.darkGreen,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.whiteTextOnGreen} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Confirm Log
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              Platform.OS === "web"
                ? 34 + bottomActionOffset
                : insets.bottom + bottomActionOffset,
          },
          isDesktop && styles.desktopContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.image, { height: imageHeight, borderRadius: 20 }]}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.mealBadge,
              { backgroundColor: colors.paleGreen },
            ]}
          >
            <Text
              style={[
                styles.mealType,
                { color: colors.ctaDarkGreen, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {mealType}
            </Text>
          </View>
          {editingDishName ? (
            <View style={styles.dishNameEditRow}>
              <TextInput
                value={dishNameDraft}
                onChangeText={setDishNameDraft}
                onBlur={() => {
                  if (confirmingDishName.current) {
                    confirmingDishName.current = false;
                    return;
                  }
                  setDishNameDraft(dishName);
                  setEditingDishName(false);
                }}
                onSubmitEditing={confirmDishNameEdit}
                autoFocus
                style={[
                  styles.dishName,
                  styles.dishNameInput,
                  {
                    color: colors.primaryText,
                    borderColor: colors.border,
                    backgroundColor: colors.cardBackground,
                    fontFamily: "Inter_700Bold",
                  },
                ]}
              />
              <TouchableOpacity
                onPressIn={confirmDishNameEdit}
                style={styles.iconButton}
                hitSlop={8}
              >
                <Feather name="check" size={18} color={colors.ctaDarkGreen} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={beginDishNameEdit}
              style={styles.dishNameRow}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dishName,
                  { color: colors.primaryText, fontFamily: "Inter_700Bold" },
                ]}
              >
                {dishName}
              </Text>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Macro Cards */}
        <View style={styles.macroGrid}>
          {[
            { label: "Calories", value: totalCalories, unit: "kcal", color: colors.fatRed },
            { label: "Protein", value: totalProtein, unit: "g", color: colors.proteinBlue },
            { label: "Carbs", value: totalCarbs, unit: "g", color: colors.carbsYellow },
            { label: "Fat", value: totalFat, unit: "g", color: colors.fatRed },
          ].map((m) => (
            <View
              key={m.label}
              style={[
                styles.macroCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderLeftColor: m.color,
                  flexBasis: isDesktop ? "23%" : "48%",
                  maxWidth: isDesktop ? "23%" : "48%",
                },
              ]}
            >
              <Text
                style={[
                  styles.macroValue,
                  {
                    color: m.color,
                    fontFamily: "Inter_700Bold",
                    fontSize: macroValueSize,
                    lineHeight: macroValueSize + 4,
                  },
                ]}
              >
                {Math.round(m.value)}
              </Text>
              <Text
                style={[
                  styles.macroUnit,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {m.unit}
              </Text>
              <Text
                style={[
                  styles.macroLabel,
                  { color: colors.bodyText, fontFamily: "Inter_500Medium" },
                ]}
              >
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Ingredients */}
        <View
          style={[
            styles.ingredientList,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.listTitle,
              { color: colors.primaryText, fontFamily: "Inter_700Bold" },
            ]}
          >
            Ingredient breakdown
          </Text>
          {ingredients.map((ing, i) => (
              <View key={i}>
                {i > 0 && (
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                )}
                {editingIndex === i ? (
                  <View style={styles.ingredientEditForm}>
                    <TextInput
                      value={editValues.name}
                      onChangeText={(name) => setEditValues((current) => ({ ...current, name }))}
                      placeholder="Ingredient name"
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.editInput,
                        {
                          color: colors.bodyText,
                          borderColor: colors.border,
                          backgroundColor: colors.cardBackground,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                    />
                    <TextInput
                      value={editValues.serving}
                      onChangeText={(serving) => setEditValues((current) => ({ ...current, serving }))}
                      placeholder="Quantity"
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.editInput,
                        {
                          color: colors.bodyText,
                          borderColor: colors.border,
                          backgroundColor: colors.cardBackground,
                          fontFamily: "Inter_400Regular",
                        },
                      ]}
                    />
                    <View style={styles.macroEditRow}>
                      {[
                        { key: "calories", label: "Cal" },
                        { key: "protein", label: "Pro" },
                        { key: "carbs", label: "Carbs" },
                        { key: "fat", label: "Fat" },
                      ].map((field) => (
                        <View key={field.key} style={styles.macroEditField}>
                          <Text
                            style={[
                              styles.editLabel,
                              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                            ]}
                          >
                            {field.label}
                          </Text>
                          <TextInput
                            value={editValues[field.key as keyof Pick<EditValues, "calories" | "protein" | "carbs" | "fat">]}
                            onChangeText={(value) =>
                              setEditValues((current) => ({ ...current, [field.key]: value }))
                            }
                            keyboardType="numeric"
                            style={[
                              styles.editInput,
                              styles.macroEditInput,
                              {
                                color: colors.bodyText,
                                borderColor: colors.border,
                                backgroundColor: colors.cardBackground,
                                fontFamily: "Inter_500Medium",
                              },
                            ]}
                          />
                        </View>
                      ))}
                    </View>
                    <View style={styles.editActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.editActionButton,
                          { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        ]}
                        onPress={cancelIngredientEdit}
                      >
                        <Text
                          style={[
                            styles.editActionText,
                            { color: colors.ctaDarkGreen, fontFamily: "Inter_600SemiBold" },
                          ]}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.editActionButton,
                          { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={saveIngredientEdit}
                      >
                        <Text
                          style={[
                            styles.editActionText,
                            { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
                          ]}
                        >
                          Save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.ingredientRow}>
                    <View style={styles.ingLeft}>
                      <Text
                        style={[
                          styles.ingName,
                          {
                            color: colors.bodyText,
                            fontFamily: "Inter_600SemiBold",
                          },
                        ]}
                      >
                        {ing.name}
                      </Text>
                      <Text
                        style={[
                          styles.ingServing,
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
                        styles.ingCal,
                        {
                          color: colors.calorieOrange,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                    >
                      {Math.round(ing.calories)} Cal
                    </Text>
                    <TouchableOpacity
                      onPress={() => beginIngredientEdit(i)}
                      style={styles.ingredientIconButton}
                      hitSlop={8}
                    >
                      <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteIngredient(i)}
                      style={styles.ingredientIconButton}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
          ))}
          <TouchableOpacity style={styles.addIngredientButton} onPress={addIngredient}>
            <Feather name="plus" size={16} color={colors.ctaDarkGreen} />
            <Text
              style={[
                styles.addIngredientText,
                { color: colors.ctaDarkGreen, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Add ingredient
            </Text>
          </TouchableOpacity>
          <View
            style={[styles.totalRow, { borderTopColor: colors.primaryGreen }]}
          >
            <Text
              style={[
                styles.totalLabel,
                { color: colors.primaryText, fontFamily: "Inter_700Bold" },
              ]}
            >
              Total
            </Text>
            <Text
              style={[
                styles.totalCal,
                { color: colors.primaryText, fontFamily: "Inter_700Bold" },
              ]}
            >
              {Math.round(totalCalories)} Cal
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom */}
      <View
        style={[
          styles.bottomBar,
          isMobile && styles.mobileBottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom:
              Platform.OS === "web" ? 34 : insets.bottom + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.cancelBtn,
            isMobile && styles.mobileFullButton,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
        >
          <Text
            style={[
              styles.cancelText,
              { color: colors.ctaDarkGreen, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            isMobile && styles.mobileFullButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={handleConfirm}
        >
          <Text
            style={[
              styles.confirmText,
              { color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Done
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: palette.light.whiteTextOnGreen },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16 },
  desktopContent: { width: "100%", maxWidth: 760, alignSelf: "center" },
  image: { width: "100%" },
  summaryCard: { gap: 8 },
  mealBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mealType: { fontSize: 13 },
  dishName: { fontSize: 24 },
  dishNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dishNameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dishNameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  macroCard: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    justifyContent: "space-between",
  },
  macroValue: { fontWeight: "700" },
  macroUnit: { fontSize: 12, lineHeight: 16 },
  macroLabel: { fontSize: 14, marginTop: 8 },
  ingredientList: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  listTitle: { fontSize: 16, padding: 16, paddingBottom: 12 },
  divider: { height: 1, marginHorizontal: 16 },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingVertical: 12,
    gap: 8,
  },
  ingLeft: { flex: 1, gap: 2 },
  ingName: { fontSize: 14 },
  ingServing: { fontSize: 12 },
  ingCal: { fontSize: 14 },
  ingredientIconButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientEditForm: {
    padding: 14,
    gap: 10,
  },
  editInput: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  macroEditRow: {
    flexDirection: "row",
    gap: 8,
  },
  macroEditField: {
    flex: 1,
    gap: 4,
  },
  editLabel: { fontSize: 11 },
  macroEditInput: { minWidth: 0 },
  editActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  editActionButton: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  editActionText: { fontSize: 14 },
  addIngredientButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 6,
  },
  addIngredientText: { fontSize: 14 },
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
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  mobileBottomBar: { flexDirection: "column" },
  mobileFullButton: { flex: 0 },
  cancelBtn: {
    flex: 1,
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
  },
  cancelText: { fontSize: 16 },
  confirmBtn: {
    flex: 2,
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
  },
  confirmText: { fontSize: 16 },
});
