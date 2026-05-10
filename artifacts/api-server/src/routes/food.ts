import { ai } from "@workspace/integrations-gemini-ai";
import { Router } from "express";

const foodRouter = Router();

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

export default foodRouter;
