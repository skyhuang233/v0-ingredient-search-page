"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Clock, Users, ChefHat, Flame, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ChatInterface } from "@/components/chat-interface"

interface RecipeDetail {
    id: number
    name: string
    description: string
    ingredients: string[]
    steps: string[]
    prep_time?: string
    cook_time?: string
    servings?: number
    calories?: number
    tags?: string[]
}

function toSentenceCase(text: string) {
    if (!text) return ""
    return text.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase())
}

export default function RecipeDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!params.id) return

            try {
                const response = await fetch(`/api/recipes/${params.id}`)

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Recipe not found")
                    }
                    throw new Error("Failed to load recipe details")
                }

                const data = await response.json()
                setRecipe(data)
            } catch (err) {
                console.error("Error fetching recipe:", err)
                setError(err instanceof Error ? err.message : "Something went wrong")
            } finally {
                setLoading(false)
            }
        }

        fetchRecipe()
    }, [params.id])

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p>Loading recipe...</p>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    if (error || !recipe) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
                    <div className="max-w-md text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold">Oops! Recipe not found</h1>
                        <p className="text-muted-foreground">
                            {error || "We couldn't find the recipe you're looking for. It might have been removed or the link is incorrect."}
                        </p>
                        <Button onClick={() => router.push("/")} size="lg" className="rounded-full mt-4">
                            Return Home
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="bg-primary/5 py-12 md:py-20 px-4">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Link
                            href="/"
                            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Search
                        </Link>

                        <div className="space-y-4 animate-fade-in-up">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {recipe.tags?.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="capitalize">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-balance">
                                {recipe.name}
                            </h1>

                            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed text-pretty">
                                {toSentenceCase(recipe.description)}
                            </p>

                            <div className="flex flex-wrap gap-6 pt-4 text-sm font-medium text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <span>{recipe.prep_time || "15 mins"} Prep</span>
                                </div>
                                {recipe.cook_time && (
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-5 h-5 text-primary" />
                                        <span>{recipe.cook_time} Cook</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    <span>{recipe.servings || "Serves 4"}</span>
                                </div>
                                {recipe.calories && (
                                    <div className="flex items-center gap-2">
                                        <ChefHat className="w-5 h-5 text-primary" />
                                        <span>{recipe.calories} kcal</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content Section */}
                <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-[1fr_1.5fr] gap-12">
                    {/* Sidebar - Ingredients */}
                    <div className="space-y-8 animate-fade-in-up animate-delay-100">
                        {/* Ingredients */}
                        <Card className="border-2 border-primary/10 shadow-lg">
                            <CardContent className="p-6 md:p-8 space-y-6">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <span className="bg-primary/10 p-2 rounded-lg text-primary">🥕</span>
                                    Ingredients
                                </h3>
                                <Separator />
                                <ul className="space-y-4">
                                    {recipe.ingredients.map((ingredient, index) => (
                                        <li key={index} className="flex items-start gap-3 text-base">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                                            <span className="leading-relaxed capitalize">{ingredient}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content - Instructions */}
                    <div className="space-y-10 animate-fade-in-up animate-delay-200">
                        <div>
                            <h3 className="text-2xl font-bold flex items-center gap-3 mb-8">
                                <span className="bg-primary/10 p-2 rounded-lg text-primary">🍳</span>
                                Instructions
                            </h3>

                            <div className="space-y-8">
                                {recipe.steps.map((step, index) => (
                                    <div key={index} className="group flex gap-4 md:gap-6">
                                        <div className="flex-none">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <div className="space-y-2 pt-1">
                                            <p className="text-lg leading-relaxed text-foreground/90">
                                                {toSentenceCase(step)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Embedded Chat Section - Horizontal & Distinct (Moved to Bottom) */}
                <section className="max-w-6xl mx-auto px-4 mb-20">
                    <div className="w-full h-[400px] rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/10 shadow-xl overflow-hidden flex flex-row relative">
                        {/* Decorative Side Panel */}
                        <div className="hidden md:flex w-1/4 bg-primary/10 flex-col justify-center items-center p-6 text-center border-r border-primary/10">
                            <div className="w-16 h-16 rounded-full bg-background shadow-sm flex items-center justify-center mb-4">
                                <span className="text-3xl">👨‍🍳</span>
                            </div>
                            <h3 className="font-bold text-primary text-xl mb-2">Chef's Corner</h3>
                            <p className="text-sm text-muted-foreground">
                                All done? Ask me for serving suggestions or next steps for <strong>{recipe.name}</strong>!
                            </p>
                        </div>

                        {/* Chat Interface */}
                        <div className="flex-1">
                            <ChatInterface
                                className="h-full bg-transparent"
                                minimal={true}
                                context={recipe}
                                initialMessage={`Great job reaching the end! Need help plating or have leftovers? Ask away! 🍳`}
                            />
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
