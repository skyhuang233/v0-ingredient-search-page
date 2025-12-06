/**
 * 健康评估核心算法
 * 包含 BMR、TDEE、BMI 计算以及宏量营养素分配
 */

// 活动水平倍数（用于TDEE计算）
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,          // 久坐：几乎不运动
  lightly_active: 1.375,   // 轻度活动：每周1-3次
  moderately_active: 1.55, // 中度活动：每周3-5次
  very_active: 1.725,      // 高度活动：每周6-7次
  extra_active: 1.9        // 超高强度：体力劳动+运动
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export type Gender = 'male' | 'female' | 'other';

export type GoalType = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'improve_health';

export interface HealthProfile {
  age: number;
  gender: Gender;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
}

export interface MacroNutrients {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/**
 * 使用 Mifflin-St Jeor 公式计算 BMR（基础代谢率）
 *
 * 公式：
 * 男性: BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 + 5
 * 女性: BMR = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄 - 161
 *
 * @param profile 用户健康档案
 * @returns BMR（卡路里/天）
 */
export function calculateBMR(profile: HealthProfile): number {
  const { age, gender, weight_kg, height_cm } = profile;

  // 基础计算
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;

  // 性别调整
  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    // 其他性别使用中性值
    bmr -= 78;
  }

  return Math.round(bmr * 100) / 100;
}

/**
 * 计算 TDEE（每日总能量消耗）
 *
 * TDEE = BMR × 活动水平倍数
 *
 * @param profile 用户健康档案
 * @returns TDEE（卡路里/天）
 */
export function calculateTDEE(profile: HealthProfile): number {
  const bmr = calculateBMR(profile);
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activity_level];
  return Math.round(bmr * multiplier);
}

/**
 * 计算 BMI（身体质量指数）
 *
 * BMI = 体重(kg) / [身高(m)]²
 *
 * @param weight_kg 体重（千克）
 * @param height_cm 身高（厘米）
 * @returns BMI（最大99.99，符合数据库DECIMAL(4,2)限制）
 */
export function calculateBMI(weight_kg: number, height_cm: number): number {
  const heightM = height_cm / 100;
  const bmi = weight_kg / (heightM * heightM);
  const roundedBMI = Math.round(bmi * 100) / 100;

  // 数据库字段限制：DECIMAL(4,2) 最大值为 99.99
  return Math.min(roundedBMI, 99.99);
}

/**
 * 获取 BMI 分类
 *
 * @param bmi BMI值
 * @returns 分类标签
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/**
 * 获取 BMI 分类的颜色（用于UI）
 */
export function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return 'text-blue-600';
  if (bmi < 25) return 'text-green-600';
  if (bmi < 30) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * 根据目标类型计算目标卡路里摄入
 *
 * @param tdee 每日总消耗
 * @param goalType 目标类型
 * @returns 目标卡路里摄入
 */
export function calculateTargetCalories(tdee: number, goalType: GoalType): number {
  switch (goalType) {
    case 'weight_loss':
      // 减重：减少500卡（约每周减0.5kg）
      return Math.round(tdee - 500);

    case 'muscle_gain':
      // 增肌：增加300卡
      return Math.round(tdee + 300);

    case 'maintenance':
    case 'improve_health':
    default:
      // 维持/健康：等于TDEE
      return tdee;
  }
}

/**
 * 计算宏量营养素分配
 *
 * 基于不同目标采用不同的营养比例：
 * - 减重：高蛋白、中碳水、低脂肪
 * - 增肌：高蛋白、高碳水、中脂肪
 * - 维持：均衡分配
 *
 * 卡路里换算：
 * - 1g 蛋白质 = 4 卡
 * - 1g 碳水化合物 = 4 卡
 * - 1g 脂肪 = 9 卡
 *
 * @param targetCalories 目标卡路里
 * @param goalType 目标类型
 * @returns 宏量营养素（克）
 */
export function calculateMacros(
  targetCalories: number,
  goalType: GoalType
): MacroNutrients {
  let proteinRatio = 0.3;  // 30%
  let fatRatio = 0.25;     // 25%
  let carbsRatio = 0.45;   // 45%

  if (goalType === 'muscle_gain') {
    // 增肌配比
    proteinRatio = 0.35;  // 35% - 更多蛋白质
    fatRatio = 0.25;      // 25%
    carbsRatio = 0.4;     // 40% - 充足碳水提供能量
  } else if (goalType === 'weight_loss') {
    // 减重配比
    proteinRatio = 0.35;  // 35% - 高蛋白保持肌肉
    fatRatio = 0.2;       // 20% - 减少脂肪
    carbsRatio = 0.45;    // 45%
  }

  // 转换为克数
  const protein_g = Math.round((targetCalories * proteinRatio) / 4);
  const carbs_g = Math.round((targetCalories * carbsRatio) / 4);
  const fat_g = Math.round((targetCalories * fatRatio) / 9);

  return { protein_g, carbs_g, fat_g };
}

/**
 * 根据目标类型计算目标体重变化速率（kg/周）
 */
export function getWeightChangeRate(goalType: GoalType): number {
  switch (goalType) {
    case 'weight_loss':
      return -0.5;  // 每周减0.5kg（健康速度）
    case 'muscle_gain':
      return 0.25;  // 每周增0.25kg
    default:
      return 0;     // 维持体重
  }
}

/**
 * 估算达到目标体重所需时间（周）
 */
export function estimateTimeToGoal(
  currentWeight: number,
  targetWeight: number,
  goalType: GoalType
): number {
  const weightDifference = targetWeight - currentWeight;
  const weeklyRate = getWeightChangeRate(goalType);

  if (weeklyRate === 0) return 0;

  const weeks = Math.abs(weightDifference / weeklyRate);
  return Math.ceil(weeks);
}

/**
 * 验证健康档案数据
 */
export function validateHealthProfile(profile: Partial<HealthProfile>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.age || profile.age < 10 || profile.age > 120) {
    errors.push('Age must be between 10 and 120');
  }

  if (!profile.weight_kg || profile.weight_kg < 20 || profile.weight_kg > 500) {
    errors.push('Weight must be between 20 and 500 kg');
  }

  if (!profile.height_cm || profile.height_cm < 50 || profile.height_cm > 300) {
    errors.push('Height must be between 50 and 300 cm');
  }

  if (!profile.gender || !['male', 'female', 'other'].includes(profile.gender)) {
    errors.push('Gender must be male, female, or other');
  }

  if (!profile.activity_level || !(profile.activity_level in ACTIVITY_MULTIPLIERS)) {
    errors.push('Invalid activity level');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 格式化营养素值（用于显示）
 */
export function formatNutrient(value: number, unit: string = 'g'): string {
  return `${Math.round(value)}${unit}`;
}

/**
 * 格式化卡路里（用于显示）
 */
export function formatCalories(calories: number): string {
  return `${Math.round(calories)} cal`;
}

/**
 * 根据 TDEE、目标类型和每周目标计算建议的卡路里摄入
 *
 * @param tdee 每日总消耗
 * @param goalType 目标类型
 * @param weeklyGoal 每周目标（kg）
 * @returns 建议的每日卡路里摄入
 */
export function suggestCalorieTarget(
  tdee: number,
  goalType: GoalType,
  weeklyGoal: number = 0
): number {
  // 1kg 脂肪 ≈ 7700 卡路里
  const caloriesPerKg = 7700;

  if (goalType === 'weight_loss') {
    // 减重：每日赤字 = (每周目标 × 7700) / 7
    const dailyDeficit = (weeklyGoal * caloriesPerKg) / 7;
    return Math.round(tdee - dailyDeficit);
  } else if (goalType === 'muscle_gain') {
    // 增肌：每日盈余 = (每周目标 × 7700) / 7
    const dailySurplus = (weeklyGoal * caloriesPerKg) / 7;
    return Math.round(tdee + dailySurplus);
  } else {
    // 维持：等于 TDEE
    return Math.round(tdee);
  }
}
