
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  goal: 'lose' | 'maintain' | 'gain';
  targetWeight: number;
  dailyCalorieTarget: number;
  avatarUrl?: string;
}

export interface FoodItem {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  imageUrl?: string;
  created_at: string; // ISO String from Supabase
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  items: FoodItem[];
  totalCalories: number;
}

export type View = 'splash' | 'login' | 'register' | 'onboarding' | 'dashboard' | 'diary' | 'add-food' | 'ai-chat' | 'analytics' | 'profile';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  structuredData?: {
    foods: Array<{
      name: string;
      calories: number;
      serving: string;
    }>;
    totalCalories: number;
  };
}
