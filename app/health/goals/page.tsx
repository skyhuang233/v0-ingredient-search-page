'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const GOAL_TYPES = [
  { value: 'weight_loss', label: 'Weight Loss', description: 'Reduce body weight and fat' },
  { value: 'muscle_gain', label: 'Muscle Gain', description: 'Build muscle mass' },
  { value: 'maintenance', label: 'Maintenance', description: 'Maintain current weight' }
]

const WEEKLY_GOALS = {
  weight_loss: [
    { value: 0.25, label: 'Slow (0.25 kg/week)' },
    { value: 0.5, label: 'Moderate (0.5 kg/week)' },
    { value: 0.75, label: 'Fast (0.75 kg/week)' },
    { value: 1.0, label: 'Very Fast (1 kg/week)' }
  ],
  muscle_gain: [
    { value: 0.25, label: 'Slow (0.25 kg/week)' },
    { value: 0.5, label: 'Moderate (0.5 kg/week)' }
  ],
  maintenance: [
    { value: 0, label: 'Maintain Current Weight' }
  ]
}

export default function HealthGoalsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(null)

  const [formData, setFormData] = useState({
    goal_type: 'weight_loss',
    target_weight_kg: '',
    target_date: '',
    weekly_goal: 0.5
  })

  useEffect(() => {
    // 模拟用户ID（实际应从认证系统获取）
    // 使用固定的UUID用于测试
    const mockUserId = '00000000-0000-0000-0000-000000000001'
    setUserId(mockUserId)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/health/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
          target_weight_kg: formData.target_weight_kg ? parseFloat(formData.target_weight_kg) : null
        })
      })

      const data = await response.json()

      if (data.success) {
        setRecommendations(data.recommendations)
        alert('Health goal set successfully!')
      } else {
        alert('Failed to set goal: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error setting goal:', error)
      alert('Failed to set goal, please try again')
    } finally {
      setSaving(false)
    }
  }

  const currentWeeklyGoals = WEEKLY_GOALS[formData.goal_type as keyof typeof WEEKLY_GOALS] || []

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Set Health Goals</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Goal Type */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Choose Your Goal</h2>
          <div className="space-y-3">
            {GOAL_TYPES.map((goal) => (
              <label
                key={goal.value}
                className="flex items-start space-x-3 p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="goal_type"
                  value={goal.value}
                  checked={formData.goal_type === goal.value}
                  onChange={(e) => {
                    const newGoalType = e.target.value
                    const defaultWeekly = WEEKLY_GOALS[newGoalType as keyof typeof WEEKLY_GOALS][0].value
                    setFormData({
                      ...formData,
                      goal_type: newGoalType,
                      weekly_goal: defaultWeekly
                    })
                  }}
                  className="w-5 h-5 mt-1"
                />
                <div>
                  <p className="font-semibold">{goal.label}</p>
                  <p className="text-sm text-gray-600">{goal.description}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Target Weight */}
        {formData.goal_type !== 'maintenance' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Target Weight</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Target Weight (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.target_weight_kg}
                  onChange={(e) => setFormData({ ...formData, target_weight_kg: e.target.value })}
                  placeholder="65.0"
                  min="30"
                  max="200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Weekly Goal */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Progress Rate</h2>
          <div className="space-y-2">
            {currentWeeklyGoals.map((weekly) => (
              <label
                key={weekly.value}
                className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="weekly_goal"
                  value={weekly.value}
                  checked={formData.weekly_goal === weekly.value}
                  onChange={(e) => setFormData({ ...formData, weekly_goal: parseFloat(e.target.value) })}
                  className="w-4 h-4"
                />
                <span>{weekly.label}</span>
              </label>
            ))}
          </div>
          {formData.goal_type === 'weight_loss' && formData.weekly_goal >= 1 && (
            <p className="mt-3 text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
              Note: Very fast weight loss may affect your health. We recommend choosing a moderate or slow pace.
            </p>
          )}
        </Card>

        {/* Recommendations */}
        {recommendations && (
          <Card className="p-6 bg-blue-50">
            <h2 className="text-xl font-semibold mb-4">Personalized Nutrition Plan</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded-md">
                <p className="text-sm text-gray-600">Daily Calorie Target</p>
                <p className="text-3xl font-bold text-blue-600">
                  {Math.round(recommendations.daily_calories)}
                </p>
                <p className="text-xs text-gray-500">
                  TDEE: {Math.round(recommendations.tdee)} calories
                </p>
              </div>

              <div className="bg-white p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  {recommendations.deficit_or_surplus > 0 ? 'Calorie Surplus' : 'Calorie Deficit'}
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {Math.abs(Math.round(recommendations.deficit_or_surplus))}
                </p>
                <p className="text-xs text-gray-500">calories/day</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-md">
              <h3 className="font-semibold mb-3">Daily Macronutrient Targets</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Protein</p>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.round(recommendations.macros.protein_g)}g
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round((recommendations.macros.protein_g * 4 / recommendations.daily_calories) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Carbohydrates</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {Math.round(recommendations.macros.carbs_g)}g
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round((recommendations.macros.carbs_g * 4 / recommendations.daily_calories) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fat</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(recommendations.macros.fat_g)}g
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round((recommendations.macros.fat_g * 9 / recommendations.daily_calories) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md text-sm">
              Tip: These nutrition targets will be used to recommend suitable recipes for you!
            </div>
            <Button
              type="button"
              onClick={() => router.push('/search')}
              className="w-full mt-4"
              size="lg"
            >
              Start Searching Recipes →
            </Button>
          </Card>
        )}

        {!recommendations && (
          <Button
            type="submit"
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? 'Setting...' : 'Set Health Goal'}
          </Button>
        )}
      </form>

      <div className="mt-8 p-4 bg-gray-100 rounded-md text-sm text-gray-700">
        <h3 className="font-semibold mb-2">Important Notes</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Please complete your health profile before setting goals</li>
          <li>Choose a moderate progress rate to avoid health issues</li>
          <li>The system will recommend recipes based on your nutrition targets</li>
          <li>You can adjust your health goals at any time</li>
        </ul>
      </div>
    </div>
  )
}
