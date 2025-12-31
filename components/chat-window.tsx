"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Bot, MessageCircle } from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"
import { useChatContext } from "@/components/chat-context"

export function ChatWindow() {
    const { activeContext, isChatOpen, setIsChatOpen } = useChatContext()

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end print:hidden">
            {/* Chat Window */}
            {isChatOpen && (
                <div className="mb-4 w-[350px] md:w-[400px] h-[550px] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <ChatInterface
                        context={activeContext}
                        className="h-full"
                        onClose={() => setIsChatOpen(false)}
                    />
                </div>
            )}

            {/* Toggle Button */}
            {!isChatOpen && (
                <Button size="lg" className="rounded-full w-14 h-14 shadow-lg p-0" onClick={() => setIsChatOpen(true)}>
                    <MessageCircle className="w-7 h-7" />
                </Button>
            )}
        </div>
    )
}
