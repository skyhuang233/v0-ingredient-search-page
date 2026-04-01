"use client"

import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Loader2, ImageIcon, Send, X } from "lucide-react"
import { RecipeCarousel } from "@/components/ui/recipe-carousel"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Message = {
    role: "user" | "assistant"
    content: string
    images?: string[]
    ui?: {
        type: "ui_component"
        component: "RecipeCarousel"
        props: any
    }
}

interface ChatInterfaceProps {
    context?: {
        id: number
        name: string
        ingredients: string[]
    } | null
    className?: string
    minimal?: boolean // If true, remove header close button etc
    initialMessage?: string
    onClose?: () => void
}

export function ChatInterface({ context, className, minimal = false, initialMessage, onClose }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Initial Greeting
    useEffect(() => {
        if (messages.length === 0 && initialMessage) {
            // Only show if no messages yet
        }
    }, [initialMessage])

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setSelectedImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!input.trim() && !selectedImage) || isLoading) return

        const userMsg: Message = {
            role: "user",
            content: input,
            images: selectedImage ? [selectedImage] : undefined
        }

        setMessages(prev => [...prev, userMsg])
        setInput("")
        setSelectedImage(null)
        setIsLoading(true)
        if (fileInputRef.current) fileInputRef.current.value = ""

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    context: context
                }),
            })

            if (!res.ok) throw new Error("Failed to fetch")
            if (!res.body) throw new Error("No response body")

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            
            // Create a placeholder assistant message
            let currentAssistantMsg: Message = { role: "assistant", content: "" }
            setMessages(prev => [...prev, currentAssistantMsg])

            let buffer = ""
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || "" // Keep last partial line

                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || !trimmed.startsWith("data: ")) continue
                    
                    const dataStr = trimmed.slice(6)
                    if (dataStr === "[DONE]") continue

                    try {
                        const data = JSON.parse(dataStr)
                        if (data.type === "text") {
                            currentAssistantMsg.content += data.content
                        } else if (data.type === "ui") {
                            currentAssistantMsg.ui = data.content
                        }
                        
                        // Functional update to avoid closure staleness
                        setMessages(prev => {
                            const newMessages = [...prev]
                            newMessages[newMessages.length - 1] = { ...currentAssistantMsg }
                            return newMessages
                        })
                    } catch (e) {
                        console.error("Streaming parse error:", e)
                    }
                }
            }
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }])
        } finally {
            setIsLoading(false)
        }
    }

    const defaultGreeting = context
        ? `Hi! Ask me anything about cooking ${context.name}! 🍳`
        : "Hi! I'm your cooking assistant. Check your fridge? Snap a photo!"

    return (
        <div className={cn("flex flex-col overflow-hidden bg-background h-full", className)}>
            {/* Header */}
            {!minimal && (
                <div className="p-4 border-b flex flex-col bg-primary text-primary-foreground">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Bot className="w-5 h-5" /> Conversational Chef
                        </h3>
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="hover:bg-primary/20 text-primary-foreground"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    {context && (
                        <div className="bg-primary-foreground/10 text-xs px-2 py-1 rounded mt-2 flex items-center gap-2">
                            <span className="font-medium">Discussing:</span> {context.name}
                        </div>
                    )}
                </div>
            )}

            {/* Context info for minimal mode */}
            {minimal && context && (
                <div className="p-3 border-b bg-muted/30 text-xs flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="font-medium text-muted-foreground">Ask Chef about this recipe</span>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto scroll-smooth min-h-[300px]" ref={scrollRef}>
                <div className="flex flex-col gap-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground mt-8 animate-fade-in-up">
                            <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>{initialMessage || defaultGreeting}</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                            <div className={cn("flex gap-2 max-w-[90%]", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                                {m.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                        <Bot className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                                <div className={cn(
                                    "rounded-lg px-3 py-2 text-sm overflow-hidden",
                                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                )}>
                                    {m.images && m.images.map((img, idx) => (
                                        <img key={idx} src={img} alt="User upload" className="max-w-full rounded-md mb-2 border border-white/20" />
                                    ))}
                                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                a: ({ node, ...props }) => (
                                                    <a {...props} className="font-bold underline hover:text-primary/80 transition-colors" target="_self" />
                                                ),
                                                p: ({ node, ...props }) => (
                                                    <p {...props} className="whitespace-pre-wrap mb-1 last:mb-0" />
                                                ),
                                                ul: ({ node, ...props }) => (
                                                    <ul {...props} className="list-disc pl-4 mb-2" />
                                                ),
                                                ol: ({ node, ...props }) => (
                                                    <ol {...props} className="list-decimal pl-4 mb-2" />
                                                )
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>

                            {/* Generative UI Rendering */}
                            {m.ui && m.ui.component === "RecipeCarousel" && (
                                <div className="w-full pl-10 mb-2 animate-in fade-in zoom-in-95 duration-300">
                                    <RecipeCarousel {...m.ui.props} />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2 justify-start animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-primary" /></div>
                            <div className="bg-muted rounded-lg px-3 py-2 text-sm italic text-muted-foreground flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background relative sticky bottom-0">
                {selectedImage && (
                    <div className="absolute bottom-16 left-4 bg-muted p-2 border rounded-md shadow-sm flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <img src={selectedImage} alt="Selected" className="h-16 w-16 object-cover rounded bg-background" />
                        <button onClick={() => setSelectedImage(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="shrink-0 text-muted-foreground hover:text-foreground">
                        <ImageIcon className="w-5 h-5" />
                    </Button>
                    <Input
                        placeholder={context ? "Ask about substitution, steps..." : "Message..."}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !selectedImage)}>
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
