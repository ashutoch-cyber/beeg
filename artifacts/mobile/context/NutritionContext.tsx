import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface FoodIngredient {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodLog {
  id: string;
  date: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  dishName: string;
  imageUri?: string;
  ingredients: FoodIngredient[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  loggedAt: string;
}

type MealTypeKey = "breakfast" | "lunch" | "dinner" | "snack";
type MealTypeTitle = FoodLog["mealType"];

interface AddLogInput {
  date?: string;
  meal_type?: MealTypeKey | MealTypeTitle;
  mealType?: MealTypeKey | MealTypeTitle;
  dish_name?: string;
  dishName?: string;
  image_uri?: string | null;
  imageUri?: string | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients?: FoodIngredient[];
  totals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export interface ScanRecord {
  date: string;
  count: number;
}

interface NutritionContextType {
  logs: FoodLog[];
  goals: DailyGoals;
  todayTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
  scanHistory: ScanRecord[];
  scanLimit: number;
  todayScans: number;
  monthScans: number;
  foodLogRefreshToken: number;
  lastLogTimestamp: number;
  streak: number;
  bestStreak: number;
  weekLoggedDays: boolean[];
  addLog: (log: AddLogInput) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  updateGoals: (goals: DailyGoals) => Promise<void>;
  addScan: () => Promise<void>;
  updateScanLimit: (limit: number) => Promise<void>;
}

const DEFAULT_GOALS: DailyGoals = {
  calories: 2500,
  protein: 120,
  carbs: 300,
  fat: 80,
  fibre: 30,
};

const DEFAULT_SCAN_LIMIT = 20;

const NutritionContext = createContext<NutritionContextType | null>(null);

const STORAGE_KEYS = {
  LOGS: "@bee_logs",
  GOALS: "@bee_goals",
  SCAN_HISTORY: "@bee_scan_history",
  SCAN_LIMIT: "@bee_scan_limit",
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getContentType(uri: string) {
  if (uri.startsWith("data:image/png") || uri.toLowerCase().endsWith(".png")) return "image/png";
  if (uri.startsWith("data:image/webp") || uri.toLowerCase().endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function getExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function normalizeMealType(mealType?: AddLogInput["meal_type"] | AddLogInput["mealType"]): MealTypeKey {
  const normalized = `${mealType ?? "snack"}`.toLowerCase();
  if (normalized === "breakfast" || normalized === "lunch" || normalized === "dinner") {
    return normalized;
  }
  return "snack";
}

function mealTypeToTitle(mealType: MealTypeKey): MealTypeTitle {
  if (mealType === "breakfast") return "Breakfast";
  if (mealType === "lunch") return "Lunch";
  if (mealType === "dinner") return "Dinner";
  return "Snack";
}

function isRemoteImageUri(uri: string) {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function isMealTypeEnumError(error: { message?: string; details?: string }) {
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return text.includes("meal_type") && text.includes("enum");
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [scanLimit, setScanLimit] = useState(DEFAULT_SCAN_LIMIT);
  const [foodLogRefreshToken, setFoodLogRefreshToken] = useState(0);
  const [lastLogTimestamp, setLastLogTimestamp] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [logsRaw, goalsRaw, scansRaw, limitRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.GOALS),
          AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.SCAN_LIMIT),
        ]);
        if (logsRaw) setLogs(JSON.parse(logsRaw));
        if (goalsRaw) setGoals(JSON.parse(goalsRaw));
        if (scansRaw) setScanHistory(JSON.parse(scansRaw));
        if (limitRaw) setScanLimit(parseInt(limitRaw, 10));
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const todayTotals = (() => {
    const today = getTodayDate();
    const todayLogs = logs.filter((l) => l.date === today);
    return todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.totals.calories,
        protein: acc.protein + log.totals.protein,
        carbs: acc.carbs + log.totals.carbs,
        fat: acc.fat + log.totals.fat,
        fibre: acc.fibre + 0,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }
    );
  })();

  const todayScans = (() => {
    const today = getTodayDate();
    return scanHistory.find((r) => r.date === today)?.count ?? 0;
  })();

  const { streak, bestStreak, weekLoggedDays } = (() => {
    const loggedDates = new Set(logs.map((l) => l.date));
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Current streak — if today not logged yet, check from yesterday
    let checkDate = new Date(today);
    if (!loggedDates.has(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
    let streak = 0;
    while (true) {
      const ds = checkDate.toISOString().split("T")[0];
      if (loggedDates.has(ds)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }

    // Best streak over all history
    const sorted = Array.from(loggedDates).sort();
    let best = 0, temp = 0, prev: string | null = null;
    for (const date of sorted) {
      if (prev === null) { temp = 1; }
      else {
        const diff = Math.round((new Date(date).getTime() - new Date(prev).getTime()) / 86400000);
        temp = diff === 1 ? temp + 1 : 1;
      }
      if (temp > best) best = temp;
      prev = date;
    }

    // This week Mon–Sun logged days
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7));
    const weekLoggedDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return loggedDates.has(d.toISOString().split("T")[0]);
    });

    return { streak, bestStreak: Math.max(best, streak), weekLoggedDays };
  })();

  const monthScans = (() => {
    const month = getCurrentMonth();
    return scanHistory
      .filter((r) => r.date.startsWith(month))
      .reduce((sum, r) => sum + r.count, 0);
  })();

  const uploadFoodSnapImage = useCallback(async (imageUri: string | null | undefined, userId: string) => {
    if (!imageUri) return null;
    if (isRemoteImageUri(imageUri)) return imageUri;

    try {
      const contentType = getContentType(imageUri);
      const extension = getExtension(contentType);
      const path = `${userId}/${Date.now()}.${extension}`;
      const response = await fetch(imageUri);
      const body = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("food-snaps")
        .upload(path, body, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("[addLog] food snap upload failed:", JSON.stringify(uploadError));
        return null;
      }

      const { data } = supabase.storage.from("food-snaps").getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error("[addLog] food snap upload failed:", error);
      return null;
    }
  }, []);

  const addLog = useCallback(async (log: AddLogInput) => {
    console.log("[addLog] called with:", JSON.stringify(log));

    const logDate = log.date ?? getTodayDate();
    const mealType = normalizeMealType(log.meal_type ?? log.mealType);
    const mealTypeTitle = mealTypeToTitle(mealType);
    const totals = {
      calories: toNumber(log.calories ?? log.totals?.calories),
      protein: toNumber(log.protein ?? log.totals?.protein),
      carbs: toNumber(log.carbs ?? log.totals?.carbs),
      fat: toNumber(log.fat ?? log.totals?.fat),
    };
    const dishName = log.dish_name ?? log.dishName ?? "Food";
    const sourceImageUri = log.image_uri ?? log.imageUri ?? null;

    const newLog: FoodLog = {
      date: logDate,
      mealType: mealTypeTitle,
      dishName,
      imageUri: sourceImageUri ?? undefined,
      ingredients: log.ingredients ?? [],
      totals,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      loggedAt: new Date().toISOString(),
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.log("[addLog] user id:", authUser?.id);

    if (!authUser || authError) {
      console.error("addLog: no authenticated user", authError);
      setFoodLogRefreshToken((token) => token + 1);
      return;
    }

    try {
      const publicImageUri = await uploadFoodSnapImage(sourceImageUri, authUser.id);
      const loggedAt = new Date().toISOString();
      const newRow = {
        user_id: authUser.id,
        date: logDate,
        meal_type: mealType,
        dish_name: dishName,
        image_uri: publicImageUri,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        ingredients: log.ingredients ? JSON.stringify(log.ingredients) : null,
        logged_at: loggedAt,
      };

      console.log("[addLog] inserting row:", JSON.stringify(newRow));

      let { data, error } = await supabase
        .from("food_logs")
        .insert(newRow)
        .select()
        .single();

      if (error && isMealTypeEnumError(error)) {
        console.error("[addLog] SUPABASE ERROR:", JSON.stringify(error));
        const legacyMealTypeRow = {
          ...newRow,
          meal_type: mealTypeTitle,
        };

        console.log("[addLog] retrying insert with legacy meal_type:", JSON.stringify(legacyMealTypeRow));
        const retryResult = await supabase
          .from("food_logs")
          .insert(legacyMealTypeRow)
          .select()
          .single();

        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error("addLog: Supabase insert failed:", error);
        console.error("[addLog] SUPABASE ERROR:", JSON.stringify(error));
      } else {
        console.log("addLog: saved to Supabase successfully", data);
        console.log("[addLog] SUCCESS, inserted id:", data?.id);
        setLastLogTimestamp(Date.now());
        if (publicImageUri && publicImageUri !== sourceImageUri) {
          setLogs((prev) => {
            const updated = prev.map((item) =>
              item.id === newLog.id ? { ...item, imageUri: publicImageUri } : item
            );
            AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated)).catch(() => {});
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("addLog: Supabase insert failed:", error);
      console.error("[addLog] SUPABASE ERROR:", JSON.stringify(error));
    } finally {
      setFoodLogRefreshToken((token) => token + 1);
    }
  }, [uploadFoodSnapImage]);

  const removeLog = useCallback(async (id: string) => {
    setLogs((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const updateGoals = useCallback(async (newGoals: DailyGoals) => {
    setGoals(newGoals);
    await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
  }, []);

  const addScan = useCallback(async () => {
    const today = getTodayDate();
    setScanHistory((prev) => {
      const existing = prev.find((r) => r.date === today);
      const updated = existing
        ? prev.map((r) => r.date === today ? { ...r, count: r.count + 1 } : r)
        : [...prev, { date: today, count: 1 }];
      AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const updateScanLimit = useCallback(async (limit: number) => {
    setScanLimit(limit);
    await AsyncStorage.setItem(STORAGE_KEYS.SCAN_LIMIT, limit.toString());
  }, []);

  return (
    <NutritionContext.Provider
      value={{
        logs,
        goals,
        todayTotals,
        scanHistory,
        scanLimit,
        todayScans,
        monthScans,
        foodLogRefreshToken,
        lastLogTimestamp,
        streak,
        bestStreak,
        weekLoggedDays,
        addLog,
        removeLog,
        updateGoals,
        addScan,
        updateScanLimit,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error("useNutrition must be used within NutritionProvider");
  return ctx;
}
