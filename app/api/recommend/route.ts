import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { rerankRecipes } from "@/lib/agent-reranker"
// Actually, I'll use the existing supabase client from lib/supabase
import { supabaseAdmin } from "@/lib/supabase"

const RECOMMENDER_URL = process.env.RECOMMENDER_URL ?? "http://localhost:8000/recommend"

export async function POST(req: NextRequest) {
  try {
    const { ingredients, userId, topk = 3 } = await req.json()

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "ingredients must be a non-empty array" }, { status: 400 })
    }

    // 1. Fetch User Profile (Bio-Data)
    // We try to fetch the profile if userId is provided.
    // NOTE: In a real app, we'd get userId from session. specific implementation details might vary.
    let userProfile = null
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profile) userProfile = profile
    }

    // 2. Broad Retrieval (Stage 1)
    // Ask the dense recommender for MORE candidates than we need (e.g., 20)
    const broadSearchTopK = 20
    const response = await fetch(RECOMMENDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, user_id: userId ?? 0, topk: broadSearchTopK }),
    })

    if (!response.ok) {
      const message = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: message?.detail ?? "Failed to get recommendations" },
        { status: response.status }
      )
    }

    const candidates = await response.json()

    // 3. Agentic Reranking (Stage 2)
    // The Agent picks the best 'topk' from the 'candidates' based on profile.
    const query = ingredients.join(", ")
    const rerankedResult = await rerankRecipes(candidates, userProfile, query, topk)

    // 4. Construct Final Response
    // Map selected IDs back to the full recipe objects
    const finalRecipes = rerankedResult.selected_recipe_ids
      .map(id => candidates.find((c: any) => c.recipe_id === id))
      .filter(Boolean)
      .map((r: any) => ({
        ...r,
        // Attach the specific reasoning for this recipe if available
        reasoning: rerankedResult.reasoning_per_recipe[r.recipe_id]
      }))

    // If for some reason we lost recipes (e.g. ID mismatch), fallback to top candidates
    const finalResults = finalRecipes.length > 0 ? finalRecipes : candidates.slice(0, topk)

    return NextResponse.json({
      results: finalResults,
      nutritionist_note: rerankedResult.nutritionist_note
    })

  } catch (error) {
    console.error("Recommend API error", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
