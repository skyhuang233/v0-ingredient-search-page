import { proxyAgent } from "@/lib/proxy"

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate"

if (!process.env.GOOGLE_VISION_API_KEY) {
  throw new Error("GOOGLE_VISION_API_KEY is not set in environment variables.")
}

type VisionLabel = {
  description?: string
  score?: number
}

/**
 * Sends image bytes to Google Vision's LABEL_DETECTION endpoint and returns the labels.
 */
export async function detectIngredientLabels(imageBuffer: Buffer): Promise<VisionLabel[]> {
  const base64Image = imageBuffer.toString("base64")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(`${VISION_API_URL}?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "LABEL_DETECTION", maxResults: 20 }],
          },
        ],
      }),
      signal: controller.signal,
      dispatcher: proxyAgent,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Vision API request failed: ${response.status} ${errorText}`)
    }

    const data = (await response.json()) as {
      responses?: Array<{ labelAnnotations?: VisionLabel[] }>
    }

    return data.responses?.[0]?.labelAnnotations ?? []
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Heuristically filter the raw labels into ingredient-friendly strings.
 */
const validIngredientPattern = /^(?:fresh\s+)?[a-z][a-z\s-]+$/i

export function normalizeLabelsToIngredients(labels: VisionLabel[]): string[] {
  const blockedKeywords = [
    "ingredient",
    "recipe",
    "cuisine",
    "dish",
    "food",
    "meal",
    "produce",
    "kitchen",
    "appliance",
    "board",
    "countertop",
    "ware",
  ]
  const genericTerms = [
    "meat",
    "red meat",
    "animal fat",
    "animal product",
    "cooking",
    "protein",
    "fatback",
    "pork belly",
  ]
  const knownIngredients = new Set([
    "beef",
    "pork",
    "chicken",
    "lamb",
    "fish",
    "salmon",
    "tuna",
    "shrimp",
    "broccoli",
    "tomato",
    "potato",
    "carrot",
    "onion",
    "garlic",
    "ginger",
    "cucumber",
    "pepper",
    "eggplant",
    "spinach",
    "lettuce",
    "basil",
    "parsley",
    "cilantro",
    "cheese",
    "butter",
    "bread",
    "rice",
    "noodle",
    "flour",
    "sugar",
    "salt",
    "oil",
    "olive oil",
  ])
  const minimumScore = 0.75

  const ingredients = new Set<string>()
  for (const label of labels) {
    const description = label.description?.trim()
    if (!description) continue

    const lower = description.toLowerCase()
    if (blockedKeywords.some((keyword) => lower.includes(keyword))) continue
    if (!validIngredientPattern.test(lower)) continue
    if (!knownIngredients.has(lower) && lower.split(/\s+/).length === 1 && lower.endsWith("ing")) continue
    if (genericTerms.includes(lower)) continue
    if (typeof label.score === "number" && label.score < minimumScore) continue

    // Keep simple words or short phrases (<=3 words) to avoid paragraphs.
    if (lower.split(/\s+/).length > 3) continue

    ingredients.add(description)
    if (ingredients.size >= 2) break
  }

  return Array.from(ingredients)
}
