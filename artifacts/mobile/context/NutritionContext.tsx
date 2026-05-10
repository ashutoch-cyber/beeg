import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [scanLimit, setScanLimit] = useState(DEFAULT_SCAN_LIMIT);

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
  }, []);

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
