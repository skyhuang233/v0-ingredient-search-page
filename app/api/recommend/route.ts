import { NextRequest, NextResponse } from "next/server"

const RECOMMENDER_URL = process.env.RECOMMENDER_URL ?? "http://localhost:8000/recommend"

export async function POST(req: NextRequest) {
  try {
    const { ingredients, userId, topk } = await req.json()

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "ingredients must be a non-empty array" }, { status: 400 })
    }

    const response = await fetch(RECOMMENDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, user_id: userId ?? 0, topk }),
    })

    if (!response.ok) {
      const message = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: message?.detail ?? "Failed to get recommendations" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ results: data })
  } catch (error) {
    console.error("Recommend API error", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
