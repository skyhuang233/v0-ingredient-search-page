// app/api/identify-ingredients/route.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai'; // 假设你使用支持视觉的多模态模型

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 将图片文件转换为 Base64 字符串
 * @param file - File 对象
 * @returns Promise<string> - Base64 格式的 Data URL
 */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

/**
 * 处理 POST 请求，用于识别图片中的食材
 * API 路径: /api/identify-ingredients
 */
export async function POST(req: NextRequest) {
    try {
        // 1. 获取上传的图片数据
        const formData = await req.formData();
        const imageFile = formData.get('image') as File | null;

        if (!imageFile || imageFile.size === 0) {
            return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
        }
        
        // 2. 将图片转换为 Base64 格式 (LLM API 通常要求这种格式)
        const base64Image = await fileToBase64(imageFile);

        // 3. 构造给多模态 LLM 的提示词
        const systemPrompt = `You are a sophisticated AI that specializes in food and ingredient recognition. Your task is to accurately identify all major edible ingredients visible in the user's image.

        Rules:
        1. List only the raw, whole ingredients (e.g., "chicken breast", "broccoli florets", "red onion"). Do not list general items like "plate" or "table".
        2. The output MUST be a strict JSON object with a single key "ingredients" which is an array of strings.
        3. The total response should be just the JSON, without any preceding text or explanation.`;

        // 4. 调用多模态 LLM (e.g., gpt-4o 或 Gemini)
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // 使用支持视觉的模型
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'What are the main ingredients in this picture?' },
                        {
                            type: 'image_url',
                            // Base64 URL 格式: data:<mime-type>;base64,<base64-string>
                            image_url: { url: base64Image },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
        });

        // 5. 解析和返回结果
        const jsonString = response.choices[0].message.content;
        const result = JSON.parse(jsonString || '{}');
        
        const ingredientsArray = Array.isArray(result.ingredients) ? result.ingredients : [];

        // 6. 成功返回识别出的食材列表
        return NextResponse.json({ ingredients: ingredientsArray });

    } catch (error) {
        console.error('Image Recognition API Error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred during image processing.' },
            { status: 500 }
        );
    }
}
