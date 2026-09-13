export type FitnessGoal = 'weight_loss' | 'fat_loss' | 'muscle_gain' | 'strength_gain' | 'body_recomposition' | 'general_fitness' | 'athletic_performance';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseType = 'strength' | 'cardio' | 'flexibility';
export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface User {
  _id: string; fullName: string; email: string; role: 'user' | 'admin'; avatarUrl?: string;
  authProvider?: 'local' | 'google'; googleId?: string; profileComplete?: boolean;
  gender: 'male' | 'female' | 'other'; age?: number; height?: number; weight?: number; currentWeight?: number; targetWeight?: number;
  measurements?: Record<string, number>; fitnessGoal: FitnessGoal; experienceLevel: ExperienceLevel; workoutDaysPerWeek: number;
  dietaryPreference: string; activityLevel: string; medicalNotes?: string; waterGoalMl: number;
  calorieTarget?: number; proteinTarget?: number; carbTarget?: number; fatTarget?: number;
  preferences: {
    theme: 'light' | 'dark' | 'system'; units: 'metric' | 'imperial'; restTimerDefault: number;
    notifications: Record<'workout' | 'water' | 'weight' | 'meal', boolean>;
    reminderTimes: { workout: string; water: number; weight: string; meal: string };
  };
  favoriteExercises: string[]; achievements: { key: string; earnedAt: string }[]; points: number; level: number;
  streak: { current: number; longest: number; lastWorkoutDate?: string }; totalWorkouts: number; totalWorkoutMinutes: number;
  isActive: boolean; lastLoginAt?: string; createdAt: string;
}

export interface Equipment {
  _id: string; name: string; slug: string; category: 'cardio' | 'strength_machine' | 'free_weight' | 'bodyweight' | 'other';
  imageUrl?: string; videoUrl?: string; description: string; purpose?: string; targetMuscles: string[]; difficulty: ExperienceLevel;
  howToUse: string[]; beginnerTips: string[]; safetyTips: string[]; recommendedUsage?: string; recommendedDuration?: string;
  recommendedWeight?: string; suggestedSpeed?: string; metActivity: string; isActive: boolean;
}

export interface Exercise {
  _id: string; name: string; slug: string; type: ExerciseType; equipment?: Equipment | null; equipmentSlug?: string;
  primaryMuscle: string; secondaryMuscles: string[]; difficulty: ExperienceLevel; instructions: string[]; tips: string[];
  imageUrl?: string; videoUrl?: string; defaultSets: number; defaultReps: number; defaultDuration?: number; isActive: boolean;
}

export interface PlanExercise {
  _id?: string; exercise?: string | null; exerciseName: string; equipment?: string | null; equipmentName?: string; muscleGroup?: string;
  type: ExerciseType; sets: number; reps: number; weight: number; duration: number; restSeconds: number; notes?: string; order?: number;
}

export interface WorkoutPlan {
  _id: string; user?: string; name: string; description?: string; focus?: string; muscleGroups: string[]; scheduledDays: Day[];
  exercises: PlanExercise[]; estimatedMinutes?: number; isTemplate: boolean; isPublic: boolean; generatedByAI: boolean; isActive: boolean; updatedAt: string;
}

export interface SessionSet { setNumber: number; reps: number; weight: number; durationSeconds?: number; completed: boolean; completedAt?: string }
export interface SessionExercise {
  _id: string; exercise?: string; exerciseName: string; equipment?: string; equipmentName?: string; muscleGroup?: string; type: ExerciseType;
  targetSets?: number; targetReps?: number; targetWeight?: number; targetDuration?: number; restSeconds: number; sets: SessionSet[];
  durationSeconds?: number; distanceKm?: number; speedKmh?: number; caloriesBurned: number; notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'; startedAt?: string; completedAt?: string; order: number;
}
export interface RoutineStep {
  _id: string; key?: string; name: string; sets: number; reps: number; durationSeconds: number;
  how?: string; why?: string; done: boolean; doneAt?: string;
}
export interface SessionRoutine {
  title: string; when?: string; why?: string; totalSeconds: number; steps: RoutineStep[]; skipped?: boolean; completedAt?: string;
}
export type RoutinePhase = 'warmup' | 'cooldown';
export interface WorkoutSession {
  _id: string; user: string | { fullName: string }; plan?: string; planName: string; focus?: string; status: 'active' | 'paused' | 'completed' | 'abandoned';
  exercises: SessionExercise[]; warmup?: SessionRoutine; cooldown?: SessionRoutine; currentExerciseIndex: number; startedAt: string; endedAt?: string; durationSeconds: number;
  totalCalories: number; totalVolume: number; muscleGroups: string[]; aiSummary?: string; rating?: number; notes?: string; shareCode?: string;
}

export interface WorkoutLog {
  _id: string; exerciseName: string; equipmentName?: string; muscleGroup?: string; type: ExerciseType; sets?: number; reps?: number; weight?: number;
  volume?: number; durationSeconds?: number; distanceKm?: number; speedKmh?: number; caloriesBurned: number; notes?: string; performedAt: string; source: string;
}

export interface Food { _id: string; name: string; slug: string; category: string; cuisine: string; dietTags: string[]; per100g: { calories: number; protein: number; carbs: number; fat: number }; servings: { label: string; grams: number }[] }
export interface Meal { _id: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; name: string; calories: number; protein: number; carbs: number; fat: number; quantity?: string; notes?: string; date: string }
export interface WaterLog { _id: string; amountMl: number; date: string }
export interface WeightEntry { _id: string; weight: number; bodyFat?: number; bmi?: number; measurements?: Record<string, number>; photoUrl?: string; photoLabel?: string; notes?: string; date: string }
export interface DietPlan {
  _id: string; name: string; planType?: string; dailyCalories: number; proteinTarget: number; carbTarget: number; fatTarget: number; waterMl?: number;
  meals: { type: string; name: string; description?: string; calories: number; protein: number; carbs: number; fat: number; items: string[] }[];
  tips: string[]; rationale?: string; isTemplate: boolean; generatedByAI: boolean; isActive: boolean; createdAt: string;
}
export interface Achievement { _id: string; key: string; title: string; description: string; icon: string; points: number; category: string; earned: boolean; earnedAt?: string | null }
export interface Notification { _id: string; type: string; title: string; message: string; link?: string; read: boolean; createdAt: string; user?: { fullName: string; email: string } | string | null }
export interface AIRecommendation { _id: string; scope: string; headline: string; recommendations: string[]; source: 'gemini' | 'rules'; createdAt: string }
export interface ChatMessage { _id: string; role: 'user' | 'assistant'; content: string; createdAt: string }

export interface PlanSuggestion { plan: { _id: string; name: string; focus?: string; muscleGroups: string[]; exerciseCount: number; estimatedMinutes?: number; isPublic: boolean; isOwn: boolean } | null; reason: string; kind: 'scheduled' | 'recovery' | 'balance' | 'none'; streak: number; sessionsThisWeek: number }
export interface MealSuggestion { name: string; description: string; items: string[]; calories: number; protein: number; carbs: number; fat: number }
export interface MealSuggestions { nextMeal: string; totals: Record<string, number>; targets: Record<string, number>; remaining: Record<string, number>; suggestions: MealSuggestion[]; source: 'gemini' | 'rules'; note: string; planName: string | null; planMeal: { name: string; calories: number; protein: number; items: string[] } | null }

export interface WeeklyPlanDay { day: string; type: 'training' | 'rest'; focus: string; muscleGroups: string[]; warmup?: string; cooldown?: string; notes?: string; planId?: string; exercises: { name: string; type: string; sets: number; reps: number; weightKg: number; durationMin: number; note: string }[] }
export interface WeeklyPlan { weekStart: string; generatedAt?: string; summary: string; days: WeeklyPlanDay[]; nutrition: { trainingDayCalories: number; restDayCalories: number; protein: number; carbs: number; fat: number; waterMl: number; mealStructure: { meal: string; protein: number; idea: string }[]; tips: string[] }; coachNotes: string[]; source: 'gemini' | 'rules' }

export interface DashboardData {
  suggestion?: PlanSuggestion | null;
  today: {
    day: string; plans: { _id: string; name: string; focus?: string; exerciseCount: number; estimatedMinutes?: number }[]; workouts: number; caloriesBurned: number;
    workoutMinutes: number; waterMl: number; waterGoalMl: number; waterRemainingMl: number; currentWeight: number; targetWeight?: number; startWeight?: number;
    goalProgress: number; bmi: number | null; bmiCategory: string; streak: number; longestStreak: number; points: number; level: number; totalWorkouts: number;
  };
  activeSession: { _id: string; planName: string; focus?: string; startedAt: string } | null;
}
