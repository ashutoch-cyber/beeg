import { GoogleGenAI } from "@google/genai";
import { Router } from "express";

const foodRouter = Router();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY must be set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MEAL_KEYS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealKey = (typeof MEAL_KEYS)[number];

interface SupabaseUser {
  id?: string;
}

interface FoodLogRow {
  dish_name: string;
  image_uri: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
  meal_type: string;
}

interface FoodLogResponse {
  dish_name: string;
  image_uri: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return {
    url: url.replace(/\/+$/, ""),
    anonKey,
  };
}

function isValidDateParam(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normaliseMealType(mealType: string): MealKey | null {
  const key = mealType.toLowerCase();
  return MEAL_KEYS.includes(key as MealKey) ? (key as MealKey) : null;
}

const FOOD_SCAN_PROMPT = `You are a professional nutritionist and food analyst. Analyze this food image carefully.

First, determine if the image contains food. 
- If it does NOT contain food (e.g. a person, pet, object, chair, phone), respond with: {"isFood": false, "dishName": "", "ingredients": [], "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}}

If it DOES contain food:
- Identify the dish name precisely (e.g. "Egg Biryani" not just "Rice")
- Perform deep ingredient segmentation — identify EVERY visible component separately
- For complex dishes like salads, identify each vegetable/ingredient separately
- For Indian Thali, identify Rice, Dal, Roti, Sabzi as separate items
- For each ingredient, estimate realistic serving size and accurate nutritional data

Return a JSON object with this exact structure:
{
  "isFood": true,
  "dishName": "string (precise dish name)",
  "ingredients": [
    {
      "name": "string (specific ingredient name)",
      "serving": "string (e.g. '100g', '1 piece', '1 bowl', 'estimated serving')",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams)
    }
  ],
  "totals": {
    "calories": number (sum of all ingredients),
    "protein": number (sum),
    "carbs": number (sum),
    "fat": number (sum)
  }
}

Be precise and comprehensive. Do not simplify. Identify all visible components.
Return ONLY the JSON object, no markdown, no extra text.`;

foodRouter.get("/food/logs", async (req, res) => {
  try {
    const date = req.query.date;
    if (typeof date !== "string" || !isValidDateParam(date)) {
      res.status(400).json({ error: "date must be a valid YYYY-MM-DD string" });
      return;
    }

    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const supabaseConfig = getSupabaseConfig();
    if (!supabaseConfig) {
      res.status(500).json({ error: "Supabase is not configured" });
      return;
    }

    const authResponse = await fetch(`${supabaseConfig.url}/auth/v1/user`, {
      headers: {
        apikey: supabaseConfig.anonKey,
        authorization,
      },
    });

    if (!authResponse.ok) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const user = (await authResponse.json()) as SupabaseUser;
    if (!user.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const logsUrl = new URL(`${supabaseConfig.url}/rest/v1/food_logs`);
    logsUrl.searchParams.set(
      "select",
      "dish_name,image_uri,calories,protein,carbs,fat,logged_at,meal_type",
    );
    logsUrl.searchParams.set("user_id", `eq.${user.id}`);
    logsUrl.searchParams.set("date", `eq.${date}`);
    logsUrl.searchParams.set("order", "logged_at.asc");

    const logsResponse = await fetch(logsUrl, {
      headers: {
        apikey: supabaseConfig.anonKey,
        authorization,
        accept: "application/json",
      },
    });

    if (!logsResponse.ok) {
      const body = await logsResponse.text();
      req.log.error({ status: logsResponse.status, body }, "Error fetching food logs");
      res.status(500).json({ error: "Failed to fetch food logs" });
      return;
    }

    const rows = (await logsResponse.json()) as FoodLogRow[];
    const meals: Partial<Record<MealKey, FoodLogResponse[]>> = {};

    for (const row of rows) {
      const key = normaliseMealType(row.meal_type);
      if (!key) continue;

      meals[key] ??= [];
      meals[key]?.push({
        dish_name: row.dish_name,
        image_uri: row.image_uri,
        calories: row.calories,
        protein: row.protein,
        carbs: row.carbs,
        fat: row.fat,
        logged_at: row.logged_at,
      });
    }

    res.json({ date, meals });
  } catch (err) {
    req.log.error({ err }, "Error fetching food logs");
    res.status(500).json({ error: "Failed to fetch food logs" });
  }
});

foodRouter.post("/food/scan", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: "imageBase64 and mimeType are required", isFood: false });
      return;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
            {
              text: FOOD_SCAN_PROMPT,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const rawText = response.text ?? "{}";
    let parsed: {
      isFood: boolean;
      dishName: string;
      ingredients: Array<{
        name: string;
        serving: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }>;
      totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      req.log.error({ rawText }, "Failed to parse Gemini response as JSON");
      res.status(500).json({ error: "Failed to analyze image", isFood: false });
      return;
    }

    if (!parsed.isFood) {
      res.status(400).json({
        error: "No food detected. Please snap a picture of your meal or a packaged food item.",
        isFood: false,
      });
      return;
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Error scanning food");
    res.status(500).json({ error: "Failed to analyze image", isFood: false });
  }
});

const INSIGHT_PROMPT = (
  totals: { calories: number; protein: number; carbs: number; fat: number; fibre: number },
  goals: { calories: number; protein: number; carbs: number; fat: number; fibre: number }
) => `You are a friendly nutrition coach. The user has eaten the following today:
- Calories: ${Math.round(totals.calories)} / ${goals.calories} kcal goal
- Protein: ${Math.round(totals.protein)}g / ${goals.protein}g goal
- Carbs: ${Math.round(totals.carbs)}g / ${goals.carbs}g goal
- Fat: ${Math.round(totals.fat)}g / ${goals.fat}g goal
- Fibre: ${Math.round(totals.fibre)}g / ${goals.fibre}g goal

Give ONE short, specific, actionable nutrition tip (max 2 sentences) based on what they are missing or excelling at today. Be encouraging, practical, and name actual foods. Do NOT use markdown. Return only a JSON object: {"tip": "...", "category": "protein"|"carbs"|"fat"|"calories"|"fibre"|"general"}`;

foodRouter.post("/food/insight", async (req, res) => {
  try {
    const { totals, goals } = req.body as {
      totals: { calories: number; protein: number; carbs: number; fat: number; fibre: number };
      goals: { calories: number; protein: number; carbs: number; fat: number; fibre: number };
    };

    if (!totals || !goals) {
      res.status(400).json({ error: "totals and goals are required" });
      return;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: INSIGHT_PROMPT(totals, goals) }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 256 },
    });

    const raw = response.text ?? "{}";
    let parsed: { tip: string; category: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(500).json({ error: "Failed to generate insight" });
      return;
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Error generating nutrition insight");
    res.status(500).json({ error: "Failed to generate insight" });
  }
});

export default foodRouter;
