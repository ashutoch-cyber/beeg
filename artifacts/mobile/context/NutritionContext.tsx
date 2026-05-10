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
  addLog: (log: Omit<FoodLog, "id" | "loggedAt">) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
  updateGoals: (goals: DailyGoals) => Promise<void>;
}

const DEFAULT_GOALS: DailyGoals = {
  calories: 2500,
  protein: 120,
  carbs: 300,
  fat: 80,
  fibre: 30,
};

const NutritionContext = createContext<NutritionContextType | null>(null);

const STORAGE_KEYS = {
  LOGS: "@healthify_logs",
  GOALS: "@healthify_goals",
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);

  useEffect(() => {
    const load = async () => {
      try {
        const [logsRaw, goalsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.GOALS),
        ]);
        if (logsRaw) setLogs(JSON.parse(logsRaw));
        if (goalsRaw) setGoals(JSON.parse(goalsRaw));
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

  return (
    <NutritionContext.Provider
      value={{ logs, goals, todayTotals, addLog, removeLog, updateGoals }}
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
