"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

type RecipeContext = {
    id: number
    name: string
    ingredients: string[]
} | null

interface ChatContextType {
    activeContext: RecipeContext
    setActiveContext: (context: RecipeContext) => void
    isChatOpen: boolean
    setIsChatOpen: (isOpen: boolean) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
    const [activeContext, setActiveContext] = useState<RecipeContext>(null)
    const [isChatOpen, setIsChatOpen] = useState(false)

    return (
        <ChatContext.Provider value={{ activeContext, setActiveContext, isChatOpen, setIsChatOpen }}>
            {children}
        </ChatContext.Provider>
    )
}

export function useChatContext() {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error('useChatContext must be used within a ChatProvider')
    }
    return context
}
