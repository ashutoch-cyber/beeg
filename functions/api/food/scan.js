const FOOD_SCAN_PROMPT = `You are a professional nutritionist and food analyst. Analyze this food image carefully.

First, determine if the image contains food.
- If it does NOT contain food (e.g. a person, pet, object, chair, phone), respond with: {"isFood": false, "dishName": "", "ingredients": [], "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}}

If it DOES contain food:
- Identify the dish name precisely (e.g. "Egg Biryani" not just "Rice")
- Perform deep ingredient segmentation and identify EVERY visible component separately
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

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

export async function onRequestPost(context) {
  try {
    if (!context.env.GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY is not configured", isFood: false }, 500);
    }

    const { imageBase64, mimeType } = await context.request.json();

    if (!imageBase64 || !mimeType) {
      return jsonResponse({ error: "imageBase64 and mimeType are required", isFood: false }, 400);
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${context.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: imageBase64,
                    mimeType,
                  },
                },
                { text: FOOD_SCAN_PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    const geminiBody = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return jsonResponse({ error: "Failed to analyze image", isFood: false }, 500);
    }

    const rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      return jsonResponse({ error: "Failed to parse Gemini response", isFood: false }, 500);
    }

    if (!parsed.isFood) {
      return jsonResponse(
        {
          error: "No food detected. Please snap a picture of your meal or a packaged food item.",
          isFood: false,
        },
        400,
      );
    }

    return jsonResponse(parsed);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to analyze image", isFood: false }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204 });
}
