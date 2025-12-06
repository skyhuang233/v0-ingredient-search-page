import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateBMI, calculateBMR, calculateTDEE } from '@/lib/health-calculator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('user_health_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ profile: data || null })
  } catch (error) {
    console.error('Error fetching health profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, age, gender, height_cm, weight_kg, activity_level, diet_preferences, allergies } = body

    if (!userId || !age || !gender || !height_cm || !weight_kg) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 计算健康指标（注意：calculateBMI参数顺序是 weight, height）
    const bmi = calculateBMI(weight_kg, height_cm)
    const bmr = calculateBMR({ age, gender, weight_kg, height_cm, activity_level })
    const tdee = calculateTDEE({ age, gender, weight_kg, height_cm, activity_level })

    // 准备数据
    const profileData = {
      user_id: userId,
      age,
      gender,
      height_cm,
      weight_kg,
      activity_level: activity_level || 'sedentary',
      bmi,
      bmr_calories: bmr,
      tdee_calories: tdee,
      diet_preferences: diet_preferences || [],
      allergies: allergies || []
    }

    // 检查是否已存在档案
    const { data: existing } = await supabaseAdmin
      .from('user_health_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    let result
    if (existing) {
      // 更新现有档案
      const { data, error } = await supabaseAdmin
        .from('user_health_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // 创建新档案
      const { data, error } = await supabaseAdmin
        .from('user_health_profiles')
        .insert(profileData)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      success: true,
      profile: result,
      metrics: {
        bmi,
        bmr_calories: bmr,
        tdee_calories: tdee
      }
    })
  } catch (error) {
    console.error('Error saving health profile:', error)
    return NextResponse.json(
      { error: 'Failed to save health profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 如果更新了身高、体重、年龄或性别，重新计算指标
    if (updates.height_cm || updates.weight_kg || updates.age || updates.gender) {
      const { data: current } = await supabaseAdmin
        .from('user_health_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (current) {
        const profile = { ...current, ...updates }
        updates.bmi = calculateBMI(profile.weight_kg, profile.height_cm)
        updates.bmr_calories = calculateBMR(profile)
        updates.tdee_calories = calculateTDEE(profile)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('user_health_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    console.error('Error updating health profile:', error)
    return NextResponse.json(
      { error: 'Failed to update health profile' },
      { status: 500 }
    )
  }
}
