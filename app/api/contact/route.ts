import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, comment } = body

    if (!name || !email || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 这里你可以：
    // 1. 保存到数据库
    // 2. 发送邮件通知
    // 3. 集成第三方服务（如 SendGrid, Mailgun 等）

    // 目前仅记录到控制台
    console.log('Contact form submission:', {
      name,
      email,
      comment,
      timestamp: new Date().toISOString()
    })

    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    })
  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}
