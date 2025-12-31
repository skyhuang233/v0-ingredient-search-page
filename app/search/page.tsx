"use client"

import type React from "react"
import Link from "next/link"
import { useState, useRef } from "react"
import { Search, Sparkles, ChefHat, Clock, Users, Plus, Loader2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useChatContext } from "@/components/chat-context"

interface RecommendedRecipe {
  recipe_id: number
  name: string
  score: number
  ingredients: string[]
  steps: string[]
  description: string
  reasoning?: string
}

function toSentenceCase(text: string) {
  return text.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase())
}

export default function IngredientSearchPage() {
  const { setActiveContext, setIsChatOpen } = useChatContext()
  const [searchQuery, setSearchQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [selectedDiets, setSelectedDiets] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [results, setResults] = useState<RecommendedRecipe[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [nutritionistNote, setNutritionistNote] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dietaryPreferences = [
    { id: "vegan", label: "Vegan", emoji: "🌱" },
    { id: "high-protein", label: "High Protein", emoji: "💪" },
    { id: "low-carb", label: "Low Carb", emoji: "🥗" },
    { id: "gluten-free", label: "Gluten Free", emoji: "🌾" },
  ]

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setErrorMessage(null)
    setNutritionistNote(null)

    const ingredients = searchQuery
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean)

    if (ingredients.length === 0) {
      setErrorMessage("Please enter at least one ingredient")
      setIsSearching(false)
      return
    }

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, userId: 1, topk: 3 }), // Hardcoded ID for demonstration if no auth context
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch recommendations" }))
        throw new Error(data.error ?? "Failed to fetch recommendations")
      }

      const data = (await response.json()) as { results: RecommendedRecipe[]; nutritionist_note?: string }
      setResults(data.results ?? [])
      setNutritionistNote(data.nutritionist_note ?? null)
      setShowResults((data.results ?? []).length > 0)
    } catch (error) {
      console.error("Search error", error)
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong")
      setShowResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleDiet = (dietId: string) => {
    setSelectedDiets((prev) => (prev.includes(dietId) ? prev.filter((id) => id !== dietId) : [...prev, dietId]))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/identify-ingredients", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to identify ingredients" }))
        throw new Error(data.error ?? "Failed to identify ingredients")
      }

      const data = (await response.json()) as { ingredients: string[] }
      const detectedIngredients = data.ingredients ?? []
      if (detectedIngredients.length === 0) {
        throw new Error("No ingredients recognized from image")
      }

      const currentIngredients = searchQuery ? searchQuery.split(",").map((i) => i.trim()) : []
      const newIngredients = detectedIngredients.filter((ing) => !currentIngredients.includes(ing))
      const updatedQuery = [...currentIngredients, ...newIngredients].filter(Boolean).join(", ")
      setSearchQuery(updatedQuery)
    } catch (error) {
      console.error("Image upload error", error)
      setErrorMessage(error instanceof Error ? error.message : "Image recognition failed")
    } finally {
      setIsUploadingImage(false)
      event.target.value = ""
    }
  }

  const handlePlusClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="px-4 py-12 md:py-20 bg-gradient-to-b from-primary/10 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-6 animate-fade-in-up">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">AI-Powered Recipe Matching</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-balance animate-fade-in-up animate-delay-100">
              What's in your kitchen?
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty animate-fade-in-up animate-delay-200">
              Tell us what ingredients you have, and we'll find the perfect recipes for you ✨
            </p>

            <div className="max-w-2xl mx-auto mb-8 animate-fade-in-up animate-delay-300">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g., tomato, chicken, garlic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-14 pr-16 py-7 text-lg rounded-full border-2 border-border focus:border-primary transition-all duration-300 shadow-lg hover:shadow-xl"
                />
                <button
                  onClick={handlePlusClick}
                  disabled={isUploadingImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Upload ingredient image"
                >
                  {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                size="lg"
                className="mt-4 rounded-full px-8 py-6 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 寻找灵感中...
                  </>
                ) : (
                  <>
                    <ChefHat className="w-5 h-5 mr-2" /> Find Recipes
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up animate-delay-300">
              <span className="text-sm text-muted-foreground self-center">Filter by:</span>
              {dietaryPreferences.map((diet) => (
                <Badge
                  key={diet.id}
                  variant={selectedDiets.includes(diet.id) ? "default" : "outline"}
                  className={`px-4 py-2 rounded-full cursor-pointer transition-all duration-300 hover:scale-105 ${selectedDiets.includes(diet.id) ? "bg-secondary text-secondary-foreground shadow-md" : "hover:bg-muted"
                    }`}
                  onClick={() => toggleDiet(diet.id)}
                >
                  <span className="mr-1">{diet.emoji}</span>
                  {diet.label}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {errorMessage && <div className="max-w-3xl mx-auto mt-6 text-center text-red-500">{errorMessage}</div>}

        {showResults && results.length > 0 && (
          <section className="px-4 py-16 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-3 animate-fade-in-up">为你精心推荐</h2>

                {nutritionistNote ? (
                  <div className="max-w-2xl mx-auto mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in-up">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="text-left">
                        <p className="font-semibold text-primary mb-1">Nutritionist's Insight</p>
                        <p className="text-muted-foreground text-sm leading-relaxed">{nutritionistNote}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-lg animate-fade-in-up animate-delay-100">
                    We found {results.length} amazing recipes based on your ingredients
                  </p>
                )}

              </div>

              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start">
                {results.map((recipe, index) => (
                  <Card
                    key={recipe.recipe_id}
                    className="group rounded-3xl border-2 border-border/60 bg-card/90 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-primary/60 h-fit"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardContent className="p-6 space-y-5">
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" /> Serves 2-4
                        </p>
                        <h3 className="text-2xl font-semibold tracking-tight capitalize text-foreground group-hover:text-primary transition-colors">
                          {recipe.name}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {toSentenceCase(recipe.description)}
                        </p>

                        {recipe.reasoning && (
                          <div className="text-sm bg-secondary/50 p-3 rounded-lg border border-secondary/20">
                            <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground opacity-70">Why this fits:</span>
                            <p className="mt-1 text-secondary-foreground/90">{recipe.reasoning}</p>
                          </div>
                        )}

                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Key Ingredients</p>
                        <div className="flex flex-col gap-2">
                          {recipe.ingredients.slice(0, 4).map((ingredient) => (
                            <span
                              key={ingredient}
                              className="inline-flex text-xs px-3 py-1 rounded-full bg-primary/10 text-primary capitalize w-fit"
                            >
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Link href={`/recipe/${recipe.recipe_id}`} className="flex-1">
                          <Button
                            size="lg"
                            className="w-full rounded-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                          >
                            View Recipe
                          </Button>
                        </Link>
                        <Button
                          size="lg"
                          variant="outline"
                          className="rounded-full w-12 h-12 p-0 shrink-0 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                          onClick={() => {
                            setActiveContext({
                              id: recipe.recipe_id,
                              name: recipe.name,
                              ingredients: recipe.ingredients
                            })
                            setIsChatOpen(true)
                          }}
                          title="Speak to Chef about this recipe"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
