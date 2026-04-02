import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ChatWindow } from '@/components/chat-window'
import { ChatProvider } from "@/components/chat-context"
import './globals.css'

export const metadata: Metadata = {
  title: 'NutriGenius',
  description: 'Smart ingredient search',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* 直接使用系统默认字体栈，不再尝试联网下载 */}
      <body className="antialiased font-sans">
        <ChatProvider>
          {children}
          <ChatWindow />
        </ChatProvider>
        <Analytics />
      </body>
    </html>
  )
}