"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Clock, Flame } from "lucide-react"

type Recipe = {
    id: number
    name: string
    description: string
    ingredients: string[]
}

interface RecipeCarouselProps {
    recipes: Recipe[]
}

export function RecipeCarousel({ recipes }: RecipeCarouselProps) {
    if (!recipes || recipes.length === 0) return null

    return (
        <div className="w-full overflow-x-auto pb-4 pt-2 snap-x snap-mandatory flex gap-4 scrollbar-hide">
            {recipes.map((recipe) => (
                <Card key={recipe.id} className="min-w-[280px] w-[280px] snap-center shrink-0 flex flex-col border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg leading-tight line-clamp-2">{recipe.name}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs mt-1">{recipe.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-2">
                        <div className="flex flex-wrap gap-1 mb-2">
                            {recipe.ingredients.slice(0, 3).map((ing, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                    {ing}
                                </Badge>
                            ))}
                            {recipe.ingredients.length > 3 && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                    +{recipe.ingredients.length - 3}
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="default" size="sm" className="w-full text-xs h-8 group">
                            View Recipe
                            <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
