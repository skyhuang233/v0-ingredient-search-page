import { NextRequest, NextResponse } from "next/server"

import { detectIngredientLabels, normalizeLabelsToIngredients } from "@/lib/vision"

export const runtime = "nodejs"
if (!process.env.GOOGLE_VISION_API_KEY) {
  throw new Error("GOOGLE_VISION_API_KEY is not set in environment variables.")
}

/**
 * 处理 POST 请求，用于识别图片中的食材
 * API 路径: /api/identify-ingredients
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get("image") as File | null

    if (!imageFile || imageFile.size === 0) {
      return NextResponse.json({ error: "No image file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    const labels = await detectIngredientLabels(imageBuffer)
    const ingredients = normalizeLabelsToIngredients(labels)

    console.log(
      "[identify-ingredients] detected labels:",
      labels.map((label) => `${label.description ?? "unknown"} (${label.score ?? 0})`)
    )
    console.log("[identify-ingredients] normalized ingredients:", ingredients)

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "No recognizable ingredients were found in the image." },
        { status: 422 }
      )
    }

    return NextResponse.json({ ingredients })
  } catch (error) {
    console.error("Image Recognition API Error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred during image processing." },
      { status: 500 }
    )
  }
}
