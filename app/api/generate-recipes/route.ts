// app/api/generate-recipes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai'; // 假设你使用 OpenAI 或兼容 API

// 检查环境变量中是否有 API Key
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

// 初始化 OpenAI 客户端
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 处理 POST 请求，用于生成 AI 菜谱
 * API 路径: /api/generate-recipes
 */
export async function POST(req: NextRequest) {
    try {
        // 1. 解析请求体，获取食材和偏好
        const { ingredients, dietaryPreference } = await req.json();

        // 基础验证
        if (!ingredients) {
            return NextResponse.json({ error: 'Ingredients are required' }, { status: 400 });
        }

        // 2. 构造给 LLM 的提示词 (Prompt)
        const preferenceText = dietaryPreference ? `and adhere to a ${dietaryPreference} diet` : '';

        const systemPrompt = `You are a world-class chef AI. Your task is to generate exactly three (3) unique, creative, and delicious recipes based on the user's input ingredients.
        
        Rules:
        1. The recipes must primarily use the user-provided ingredients.
        2. The output MUST be a strict JSON array of objects.
        3. Each object MUST have the keys: "title" (string), "description" (string, max 30 words), "instructions" (string, step-by-step list), and "ingredients" (string, detailed list).
        4. The total response should be just the JSON, without any preceding text or explanation.`;

        const userPrompt = `Generate 3 recipes using the following main ingredients: "${ingredients}". ${preferenceText}.`;

        // 3. 调用 LLM API
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // 推荐使用高效模型
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: "json_object" }, // 强制要求 JSON 格式
            temperature: 0.7,
        });

        // 4. 解析和返回结果
        const jsonString = response.choices[0].message.content;
        
        // LLM 有时会将 JSON 包装在一个顶级对象中，这里尝试安全解析
        let recipes = JSON.parse(jsonString || '{}');

        // 如果 LLM 返回的是 { recipes: [...] } 结构，提取数组
        if (recipes.recipes && Array.isArray(recipes.recipes)) {
            recipes = recipes.recipes;
        }

        if (!Array.isArray(recipes) || recipes.length === 0) {
             return NextResponse.json({ error: 'Failed to generate valid recipes from LLM' }, { status: 500 });
        }


        // 5. 成功返回菜谱数组
        return NextResponse.json({ recipes });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during recipe generation.' },
            { status: 500 }
        );
    }
}
