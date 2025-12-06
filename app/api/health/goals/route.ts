import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateMacros, suggestCalorieTarget } from '@/lib/health-calculator'

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
      .from('health_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ goals: data || [] })
  } catch (error) {
    console.error('Error fetching health goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch health goals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, goal_type, target_weight_kg, target_date, weekly_goal } = body

    if (!userId || !goal_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 获取用户健康档案
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_health_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Health profile not found. Please create a health profile first.' },
        { status: 404 }
      )
    }

    // 计算建议的卡路里目标和宏量营养素
    const calorieTarget = suggestCalorieTarget(
      profile.tdee_calories,
      goal_type,
      weekly_goal
    )

    const macros = calculateMacros(calorieTarget, goal_type)

    // 准备目标数据
    const goalData = {
      user_id: userId,
      goal_type,
      target_weight_kg: target_weight_kg || profile.weight_kg,
      target_date,
      target_calories_per_day: calorieTarget,
      target_protein_g: macros.protein_g,
      target_carbs_g: macros.carbs_g,
      target_fat_g: macros.fat_g,
      is_active: true
    }

    // 将所有其他活跃目标设置为非活跃
    await supabaseAdmin
      .from('health_goals')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)

    // 创建新目标
    const { data, error } = await supabaseAdmin
      .from('health_goals')
      .insert(goalData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      goal: data,
      recommendations: {
        daily_calories: calorieTarget,
        macros: {
          protein_g: macros.protein_g,
          carbs_g: macros.carbs_g,
          fat_g: macros.fat_g
        },
        tdee: profile.tdee_calories,
        deficit_or_surplus: calorieTarget - profile.tdee_calories
      }
    })
  } catch (error) {
    console.error('Error creating health goal:', error)
    return NextResponse.json(
      { error: 'Failed to create health goal' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { goalId, ...updates } = body

    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      )
    }

    // 如果更新目标类型或每周目标，重新计算卡路里和宏量
    if (updates.goal_type || updates.weekly_goal) {
      const { data: goal } = await supabaseAdmin
        .from('health_goals')
        .select('*, user_health_profiles(*)')
        .eq('id', goalId)
        .single()

      if (goal && goal.user_health_profiles) {
        const tdee = goal.user_health_profiles.tdee_calories
        const goalType = updates.goal_type || goal.goal_type
        const weeklyGoal = updates.weekly_goal || goal.weekly_goal

        const calorieTarget = suggestCalorieTarget(tdee, goalType, weeklyGoal)
        const macros = calculateMacros(calorieTarget, goalType)

        updates.target_calories_per_day = calorieTarget
        updates.target_protein_g = macros.protein_g
        updates.target_carbs_g = macros.carbs_g
        updates.target_fat_g = macros.fat_g
      }
    }

    const { data, error } = await supabaseAdmin
      .from('health_goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, goal: data })
  } catch (error) {
    console.error('Error updating health goal:', error)
    return NextResponse.json(
      { error: 'Failed to update health goal' },
      { status: 500 }
    )
  }
}
