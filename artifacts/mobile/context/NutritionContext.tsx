import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
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
  streak: number;
  bestStreak: number;
  weekLoggedDays: boolean[];
  addLog: (log: Omit<FoodLog, "id" | "loggedAt">) => Promise<void>;
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

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [scanLimit, setScanLimit] = useState(DEFAULT_SCAN_LIMIT);
  const [foodLogRefreshToken, setFoodLogRefreshToken] = useState(0);

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

  const addLog = useCallback(async (log: Omit<FoodLog, "id" | "loggedAt">) => {
    const newLog: FoodLog = {
      ...log,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      loggedAt: new Date().toISOString(),
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    if (!user) {
      setFoodLogRefreshToken((token) => token + 1);
      return;
    }

    try {
      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        date: log.date,
        meal_type: log.mealType,
        dish_name: log.dishName,
        image_uri: log.imageUri ?? null,
        calories: log.totals.calories,
        protein: log.totals.protein,
        carbs: log.totals.carbs,
        fat: log.totals.fat,
      });

      if (error) {
        console.error("Failed to sync food log to Supabase", error);
      }
    } catch (error) {
      console.error("Failed to sync food log to Supabase", error);
    } finally {
      setFoodLogRefreshToken((token) => token + 1);
    }
  }, [user]);

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
