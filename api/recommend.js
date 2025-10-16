// api/recommend.js
// Deploy on Vercel as a serverless function.
// Requires env var: OPENAI_API_KEY
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body;
    const ingredients = body.ingredients || [];
    const preferences = body.preferences || ""; // e.g. "vegetarian, low-carb, no nuts"

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "Please provide a non-empty `ingredients` array." });
    }

    // Build prompt (see section 3 for the template)
    const prompt = buildPrompt(ingredients, preferences);

    // Call LLM (OpenAI Chat Completions style)
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",         // 替换成你有权限的模型
        messages: [
          { role: "system", content: "You are a helpful assistant that returns JSON with recipe recommendations." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    if (!openaiResp.ok) {
      const t = await openaiResp.text();
      return res.status(502).json({ error: "LLM provider error", detail: t });
    }

    const data = await openaiResp.json();

    // Extract assistant text (safe-guard if provider returns multiple choices)
    const assistantText = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";

    // Try to parse JSON out of text
    let parsed;
    try {
      parsed = JSON.parse(assistantText);
    } catch (e) {
      // fallback: try to locate first JSON block inside text
      const jsonMatch = assistantText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch(err) {
            // failed even after trimming
            return res.status(502).json({
                error: "Failed to parse LLM response as JSON (fallback attempt failed)",
                raw: assistantText
            });
        }
      } else {
        return res.status(502).json({
          error: "Failed to parse LLM response as JSON",
          raw: assistantText
        });
      }
    }

    // Basic validation: expect { recipes: [...] }
    if (!parsed || !Array.isArray(parsed.recipes)) {
      return res.status(502).json({ error: "Unexpected response format from LLM", parsed });
    }

    return res.status(200).json({ recipes: parsed.recipes });

  } catch (err) {
    console.error("recommend error:", err);
    return res.status(500).json({ error: "Internal server error", message: String(err) });
  }
}

// helper: compose prompt
function buildPrompt(ingredients, preferences) {
  const ingText = ingredients.join(", ");
  return `User-provided ingredients: ${ingText}
Dietary preferences / restrictions: ${preferences}

You must return a JSON object with a top-level key "recipes" containing exactly 3 recipe objects, ordered from best match (1) to least (3).

Each recipe object MUST have these fields:
- title: short string
- match_score: number (0-100) — how well the recipe fits the user's ingredients & preferences
- used_ingredients: array of ingredient strings actually used from the user's list
- additional_ingredients: array of ingredient strings the recipe needs but the user did not provide
- estimated_time_minutes: integer
- servings: integer
- steps: array of short step strings (3-10 steps)
- tags: array of short strings (e.g., "vegetarian", "gluten-free", "quick")
- brief_description: one-sentence description

Important:
- Only use user's ingredients where sensical; list missing ingredients clearly.
- Keep all strings concise.
- Output must be valid JSON only (no extra commentary).
Respond now with the JSON only.`;
}
