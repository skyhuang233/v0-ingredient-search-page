import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, context } = body; // Extract context

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        // Extract the latest message and history
        const latestMessage = messages[messages.length - 1].content;
        const images = messages[messages.length - 1].images || [];

        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        // Forward to Python Service
        // Ensure the Python service is running on port 8000
        const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000/agent/chat';

        const response = await fetch(AGENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: latestMessage,
                images: images,
                context: context, // Forward context
                history: history,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Agent Service Error:', errorText);
            return NextResponse.json({ error: 'Failed to get response from agent' }, { status: response.status });
        }

        const data = await response.json();

        // Return the assistant's message
        return NextResponse.json({ role: 'assistant', content: data.response });

    } catch (error) {
        console.error('Chat Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
