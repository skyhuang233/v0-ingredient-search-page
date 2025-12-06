'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (little or no exercise)', multiplier: 1.2 },
  { value: 'lightly_active', label: 'Lightly Active (1-3 days/week)', multiplier: 1.375 },
  { value: 'moderately_active', label: 'Moderately Active (3-5 days/week)', multiplier: 1.55 },
  { value: 'very_active', label: 'Very Active (6-7 days/week)', multiplier: 1.725 },
  { value: 'extra_active', label: 'Extra Active (physical job/training 2x/day)', multiplier: 1.9 }
]

const DIET_PREFERENCES = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'low-carb', 'keto', 'paleo', 'mediterranean'
]

export default function HealthProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)

  const [formData, setFormData] = useState({
    age: '',
    gender: 'male',
    height_cm: '',
    weight_kg: '',
    activity_level: 'sedentary',
    diet_preferences: [] as string[],
    allergies: [] as string[]
  })

  const [allergyInput, setAllergyInput] = useState('')

  useEffect(() => {
    // 模拟用户ID（实际应从认证系统获取）
    // 生成一个固定的UUID用于测试
    const mockUserId = '00000000-0000-0000-0000-000000000001'
    setUserId(mockUserId)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/health/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
          age: parseInt(formData.age),
          height_cm: parseFloat(formData.height_cm),
          weight_kg: parseFloat(formData.weight_kg)
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      if (!text) {
        throw new Error('Empty response from server')
      }

      const data = JSON.parse(text)

      if (data.success) {
        setMetrics(data.metrics)
        alert('Health profile saved successfully!')
      } else {
        alert('Save failed: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Save failed: ' + (error instanceof Error ? error.message : 'Please try again'))
    } finally {
      setSaving(false)
    }
  }

  const toggleDietPreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      diet_preferences: prev.diet_preferences.includes(pref)
        ? prev.diet_preferences.filter(p => p !== pref)
        : [...prev.diet_preferences, pref]
    }))
  }

  const addAllergy = () => {
    if (allergyInput.trim() && !formData.allergies.includes(allergyInput.trim())) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()]
      }))
      setAllergyInput('')
    }
  }

  const removeAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== allergy)
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Health Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Age</label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="25"
                required
                min="10"
                max="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Height (cm)</label>
              <Input
                type="number"
                step="0.1"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                placeholder="170"
                required
                min="50"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="70"
                required
                min="20"
                max="500"
              />
            </div>
          </div>
        </Card>

        {/* Activity Level */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Level</h2>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <label key={level.value} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="activity_level"
                  value={level.value}
                  checked={formData.activity_level === level.value}
                  onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                  className="w-4 h-4"
                />
                <span>{level.label}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Diet Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Diet Preferences (Multiple Selection)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DIET_PREFERENCES.map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => toggleDietPreference(pref)}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  formData.diet_preferences.includes(pref)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                {pref}
              </button>
            ))}
          </div>
        </Card>

        {/* Allergies */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Food Allergies</h2>
          <div className="flex gap-2 mb-3">
            <Input
              type="text"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              placeholder="Enter allergen, e.g. peanuts"
            />
            <Button type="button" onClick={addAllergy}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.allergies.map((allergy) => (
              <span
                key={allergy}
                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-2"
              >
                {allergy}
                <button
                  type="button"
                  onClick={() => removeAllergy(allergy)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </Card>

        {/* Results */}
        {metrics && (
          <Card className="p-6 bg-green-50">
            <h2 className="text-xl font-semibold mb-4">Your Health Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">BMI (Body Mass Index)</p>
                <p className="text-2xl font-bold">{metrics.bmi.toFixed(1)}</p>
                <p className="text-xs text-gray-500">
                  {metrics.bmi < 18.5 ? 'Underweight' :
                   metrics.bmi < 25 ? 'Normal' :
                   metrics.bmi < 30 ? 'Overweight' : 'Obese'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">BMR (Basal Metabolic Rate)</p>
                <p className="text-2xl font-bold">{Math.round(metrics.bmr_calories)}</p>
                <p className="text-xs text-gray-500">calories/day</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">TDEE (Total Daily Energy)</p>
                <p className="text-2xl font-bold">{Math.round(metrics.tdee_calories)}</p>
                <p className="text-xs text-gray-500">calories/day</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => router.push('/health/goals')}
              className="w-full"
              size="lg"
            >
              Continue to Set Health Goals →
            </Button>
          </Card>
        )}

        {!metrics && (
          <Button
            type="submit"
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? 'Saving...' : 'Save Health Profile'}
          </Button>
        )}
      </form>
    </div>
  )
}
