"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Search, Sparkles, ChefHat, Clock, Users, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function IngredientSearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [selectedDiets, setSelectedDiets] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dietaryPreferences = [
    { id: "vegan", label: "Vegan", emoji: "🌱" },
    { id: "high-protein", label: "High Protein", emoji: "💪" },
    { id: "low-carb", label: "Low Carb", emoji: "🥗" },
    { id: "gluten-free", label: "Gluten Free", emoji: "🌾" },
  ]

  const recipes = [
    {
      id: 1,
      title: "地中海柠檬烤鸡胸",
      description: "新鲜健康的烤鸡胸配柠檬和香草,清爽不油腻",
      image: "/creamy-tomato-garlic-chicken-dish.jpg",
      cookTime: "30 min",
      servings: "4",
      matchScore: 95,
      ingredients: ["鸡胸肉", "柠檬", "橄榄油", "迷迭香"],
    },
    {
      id: 2,
      title: "蒜香番茄炖鸡",
      description: "浓郁的番茄酱汁配上嫩滑的鸡肉和大蒜,家常美味",
      image: "/mediterranean-chicken-bowl-with-tomatoes.jpg",
      cookTime: "25 min",
      servings: "2",
      matchScore: 88,
      ingredients: ["鸡腿肉", "番茄", "大蒜", "洋葱"],
    },
    {
      id: 3,
      title: "黄油蒜香煎鸡排",
      description: "快手一锅料理,香煎鸡排配樱桃番茄和黄油蒜香",
      image: "/garlic-butter-chicken-skillet-with-tomatoes.jpg",
      cookTime: "20 min",
      servings: "3",
      matchScore: 92,
      ingredients: ["鸡排", "樱桃番茄", "黄油", "大蒜"],
    },
  ]

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setIsSearching(false)
      setShowResults(true)
    }
  }

  const toggleDiet = (dietId: string) => {
    setSelectedDiets((prev) => (prev.includes(dietId) ? prev.filter((id) => id !== dietId) : [...prev, dietId]))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploadingImage(true)

      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulated AI ingredient detection in Chinese
      const detectedIngredients = ["西兰花", "三文鱼", "柠檬", "大蒜", "番茄"]

      // Add detected ingredients to search query
      const currentIngredients = searchQuery ? searchQuery.split(",").map((i) => i.trim()) : []
      const newIngredients = detectedIngredients.filter((ing) => !currentIngredients.includes(ing))
      const updatedQuery = [...currentIngredients, ...newIngredients].join(", ")

      setSearchQuery(updatedQuery)
      setIsUploadingImage(false)
    }
  }

  const handlePlusClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section with Search */}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                size="lg"
                className="mt-4 rounded-full px-8 py-6 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    寻找灵感中...
                  </>
                ) : (
                  <>
                    <ChefHat className="w-5 h-5 mr-2" />
                    Find Recipes
                  </>
                )}
              </Button>
            </div>

            {/* Dietary Preferences */}
            <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up animate-delay-300">
              <span className="text-sm text-muted-foreground self-center">Filter by:</span>
              {dietaryPreferences.map((diet) => (
                <Badge
                  key={diet.id}
                  variant={selectedDiets.includes(diet.id) ? "default" : "outline"}
                  className={`px-4 py-2 rounded-full cursor-pointer transition-all duration-300 hover:scale-105 ${
                    selectedDiets.includes(diet.id)
                      ? "bg-secondary text-secondary-foreground shadow-md"
                      : "hover:bg-muted"
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

        {/* Results Section */}
        {showResults && (
          <section className="px-4 py-16 bg-background">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-3 animate-fade-in-up">为你精心推荐</h2>
                <p className="text-muted-foreground text-lg animate-fade-in-up animate-delay-100">
                  We found {recipes.length} amazing recipes based on your ingredients
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recipes.map((recipe, index) => (
                  <Card
                    key={recipe.id}
                    className="group overflow-hidden rounded-3xl border-2 border-border hover:border-primary transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 animate-fade-in-up bg-card"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={recipe.image || "/placeholder.svg"}
                        alt={recipe.title}
                        className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                        {recipe.matchScore}% Match
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">
                        {recipe.title}
                      </h3>

                      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{recipe.description}</p>

                      <div className="mb-4">
                        <p className="text-sm font-semibold mb-2">主要食材:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {recipe.ingredients.map((ingredient, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                              {ingredient}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{recipe.cookTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{recipe.servings} servings</span>
                        </div>
                      </div>

                      <Button
                        className="w-full rounded-full font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg"
                        size="lg"
                      >
                        View Recipe
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* CTA Section */}
              <div className="mt-16 text-center p-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-3xl animate-fade-in-up">
                <h3 className="text-2xl font-bold mb-3">Want more personalized results?</h3>
                <p className="text-muted-foreground mb-6">
                  Create a free account to save your favorite recipes and get better recommendations!
                </p>
                <Button
                  size="lg"
                  className="rounded-full px-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Sign Up Free
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {!showResults && (
          <section className="px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center animate-fade-in-up">
                <ChefHat className="w-16 h-16 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-3 animate-fade-in-up animate-delay-100">
                Ready to discover amazing recipes?
              </h3>
              <p className="text-muted-foreground text-lg animate-fade-in-up animate-delay-200">
                Just type in the ingredients you have and let our AI do the magic! 🪄
              </p>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
