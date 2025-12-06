import { NextRequest, NextResponse } from "next/server"

const RECIPE_DETAIL_URL = process.env.RECIPE_DETAIL_URL ?? "http://localhost:8000/recipe"

interface RouteContext {
  params: { id: string }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = context.params
    const response = await fetch(`${RECIPE_DETAIL_URL}/${id}`, { cache: "no-store" })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ detail: "Failed to fetch recipe" }))
      return NextResponse.json({ error: payload.detail ?? "Recipe not found" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Recipe detail API error", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
