
import OpenAI from "openai"

import { HealthProfile } from "./health-calculator"

// Extended profile to include fields potentially stored in DB but not used in BMR calc
interface ExtendedHealthProfile extends HealthProfile {
    goal?: string
    dietary_preferences?: string[]
}

// Initialize OpenAI Client (compatible with DeepSeek)
// Use a dummy key if missing to prevent "Module not found" or init crashes on route load.
// The actual call will fail gracefully in the try/catch block if the key is invalid.
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "dummy_key_for_init"
const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.deepseek.com",
})

export interface RerankedResult {
    selected_recipe_ids: number[]
    nutritionist_note: string
    reasoning_per_recipe: Record<number, string>
}

/**
 * Agentic Reranker: Selects the best recipes based on User Profile + Query
 * 
 * @param candidates List of recipe objects (broad retrieval)
 * @param profile User's health profile (optional)
 * @param query User's original ingredient query
 * @param topk Number of final recipes to select
 */
export async function rerankRecipes(
    candidates: any[],
    profile: ExtendedHealthProfile | null,
    query: string,
    topk: number = 3
): Promise<RerankedResult> {
    // If no profile, we can fallback to a simpler explanation or just pass through.
    // But for this "Agentic" feature, we'll try to just act as a helpful chef if no profile.
    if (!Array.isArray(candidates) || candidates.length === 0) {
        return {
            selected_recipe_ids: [],
            nutritionist_note: "No recipes found to analyze.",
            reasoning_per_recipe: {}
        }
    }

    const userContext = profile
        ? `
    User Profile:
    - Goal: ${profile.goal || "Eat Healthy"}
    - Weight: ${profile.weight_kg}kg
    - Activity: ${profile.activity_level}
    - Dietary Restrictions: ${profile.dietary_preferences?.join(", ") || "None"}
    `
        : "User Profile: General user, no specific health data provided."

    const candidatesStr = candidates
        .map((r, i) => `ID ${r.recipe_id}: ${r.name} (Ingredients: ${r.ingredients.slice(0, 5).join(", ")}...)`)
        .join("\n")

    const systemPrompt = `
  You are an expert Nutritionist and Chef Agent.
  Your goal is to select the best ${topk} recipes from the provided candidates that match the user's available ingredients AND their health goals.

  ${userContext}

  User Ingredients Query: "${query}"

  Task:
  1. Analyze the candidates.
  2. SELECT the top ${topk} recipes that best fit the intersection of "Uses Ingredients" and "Matches User Goal".
     - Example: If User Goal is "Muscle Gain", prioritize high protein.
     - Example: If User Goal is "Weight Loss", prioritize lower calorie/high volume.
  3. EXPLAIN your selection with a "Nutritionist Note" directed to the user.
     - Tone: Encouraging, professional, insight-driven.

  Output Format (JSON Only):
  {
    "selected_recipe_ids": [id1, id2, id3],
    "nutritionist_note": "Your overall summary to the user...",
    "reasoning_per_recipe": {
      "id1": "Why this specific recipe...",
      "id2": "Why this...",
      "id3": "..."
    }
  }
  `

    try {
        const response = await openai.chat.completions.create({
            model: "deepseek-chat", // DeepSeek model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Candidates:\n${candidatesStr}` },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        })

        const rawContent = response.choices[0].message.content
        if (!rawContent) throw new Error("No content from Agent")

        const result = JSON.parse(rawContent) as RerankedResult
        return result

    } catch (error) {
        console.error("Agent Reranking Failed:", error)
        // Fallback: Just return the top k from the original list
        return {
            selected_recipe_ids: candidates.slice(0, topk).map(r => r.recipe_id),
            nutritionist_note: "We found these recipes based on your ingredients. (AI Reranking unavailable)",
            reasoning_per_recipe: {}
        }
    }
}
