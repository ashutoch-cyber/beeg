const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function buildInsightPrompt(totals, goals) {
  return `You are a friendly nutrition coach. The user has eaten the following today:
- Calories: ${Math.round(totals.calories)} / ${goals.calories} kcal goal
- Protein: ${Math.round(totals.protein)}g / ${goals.protein}g goal
- Carbs: ${Math.round(totals.carbs)}g / ${goals.carbs}g goal
- Fat: ${Math.round(totals.fat)}g / ${goals.fat}g goal
- Fibre: ${Math.round(totals.fibre)}g / ${goals.fibre}g goal

Give ONE short, specific, actionable nutrition tip (max 2 sentences) based on what they are missing or excelling at today. Be encouraging, practical, and name actual foods. Do NOT use markdown. Return only a JSON object: {"tip": "...", "category": "protein"|"carbs"|"fat"|"calories"|"fibre"|"general"}`;
}

export async function onRequestPost(context) {
  try {
    if (!context.env.GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY is not configured" }, 500);
    }

    const { totals, goals } = await context.request.json();

    if (!totals || !goals) {
      return jsonResponse({ error: "totals and goals are required" }, 400);
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
              parts: [{ text: buildInsightPrompt(totals, goals) }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 256,
          },
        }),
      },
    );

    const geminiBody = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return jsonResponse({ error: "Failed to generate insight" }, 500);
    }

    const rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      return jsonResponse({ error: "Failed to parse Gemini response" }, 500);
    }

    return jsonResponse(parsed);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Failed to generate insight" }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204 });
}
