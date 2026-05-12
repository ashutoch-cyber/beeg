import {
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { authUsers } from "./auth";

export const mealTypeEnum = pgEnum("meal_type", ["Breakfast", "Lunch", "Dinner", "Snack"]);

export const dailyGoals = pgTable(
  "daily_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    calories: doublePrecision("calories").default(2500).notNull(),
    protein: doublePrecision("protein").default(120).notNull(),
    carbs: doublePrecision("carbs").default(300).notNull(),
    fat: doublePrecision("fat").default(80).notNull(),
    fibre: doublePrecision("fibre").default(30).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("daily_goals_user_id_key").on(table.userId)],
);

export const foodLogs = pgTable(
  "food_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    dishName: text("dish_name").notNull(),
    imageUri: text("image_uri"),
    calories: doublePrecision("calories").default(0).notNull(),
    protein: doublePrecision("protein").default(0).notNull(),
    carbs: doublePrecision("carbs").default(0).notNull(),
    fat: doublePrecision("fat").default(0).notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("food_logs_user_date_idx").on(table.userId, table.date),
    index("food_logs_logged_at_idx").on(table.loggedAt),
  ],
);

export const foodIngredients = pgTable(
  "food_ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    foodLogId: uuid("food_log_id")
      .notNull()
      .references(() => foodLogs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    serving: text("serving").notNull(),
    calories: doublePrecision("calories").default(0).notNull(),
    protein: doublePrecision("protein").default(0).notNull(),
    carbs: doublePrecision("carbs").default(0).notNull(),
    fat: doublePrecision("fat").default(0).notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("food_ingredients_food_log_id_idx").on(table.foodLogId)],
);

export const scanUsage = pgTable(
  "scan_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    scanDate: date("scan_date").notNull(),
    count: integer("count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("scan_usage_user_date_key").on(table.userId, table.scanDate)],
);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  scanLimit: integer("scan_limit").default(20).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDailyGoalSchema = createInsertSchema(dailyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFoodLogSchema = createInsertSchema(foodLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertFoodIngredientSchema = createInsertSchema(foodIngredients).omit({
  id: true,
  createdAt: true,
});
export const insertScanUsageSchema = createInsertSchema(scanUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  createdAt: true,
  updatedAt: true,
});

export type DailyGoal = typeof dailyGoals.$inferSelect;
export type InsertDailyGoal = z.infer<typeof insertDailyGoalSchema>;
export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = z.infer<typeof insertFoodLogSchema>;
export type FoodIngredient = typeof foodIngredients.$inferSelect;
export type InsertFoodIngredient = z.infer<typeof insertFoodIngredientSchema>;
export type ScanUsage = typeof scanUsage.$inferSelect;
export type InsertScanUsage = z.infer<typeof insertScanUsageSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
