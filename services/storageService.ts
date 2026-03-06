
import { FoodItem, UserProfile } from '../types';
import { supabase } from '../supabaseService';

const IS_DEMO = false; // Toggle for testing

export const storageService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        age: data.age,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        activityLevel: data.activity_level,
        goal: data.goal,
        targetWeight: data.target_weight,
        dailyCalorieTarget: data.daily_calorie_target,
        avatarUrl: data.avatar_url
      };
    } catch (err) {
      console.warn("Supabase profile fetch failed, checking local storage:", err);
      const local = localStorage.getItem(`profile_${userId}`);
      return local ? JSON.parse(local) : null;
    }
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    // Always save to local storage as backup
    localStorage.setItem(`profile_${profile.id}`, JSON.stringify(profile));
    
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: profile.id,
        full_name: profile.fullName,
        email: profile.email,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        activity_level: profile.activityLevel,
        goal: profile.goal,
        target_weight: profile.targetWeight,
        daily_calorie_target: profile.dailyCalorieTarget,
        avatar_url: profile.avatarUrl
      });
      if (error) throw error;
    } catch (err) {
      console.error("Supabase profile save failed:", err);
      // We don't throw here because local storage is our fallback
    }
  },

  async getFoodItems(userId: string, dateStr: string): Promise<FoodItem[]> {
    try {
      const start = new Date(dateStr);
      start.setHours(0,0,0,0);
      const end = new Date(dateStr);
      end.setHours(23,59,59,999);

      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      
      if (error) throw error;
      return data as FoodItem[];
    } catch (err) {
      console.warn("Supabase food fetch failed, checking local storage:", err);
      const local = localStorage.getItem(`food_${userId}_${dateStr}`);
      return local ? JSON.parse(local) : [];
    }
  },

  async saveFoodItem(userId: string, item: Partial<FoodItem>): Promise<FoodItem> {
    const newItem: FoodItem = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      name: item.name || 'Unknown',
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fats: item.fats || 0,
      servingSize: item.servingSize || '1 portion',
      mealType: item.mealType || 'snack',
      created_at: new Date().toISOString()
    };

    // Save to local storage
    const dateStr = new Date().toISOString().split('T')[0];
    const existing = JSON.parse(localStorage.getItem(`food_${userId}_${dateStr}`) || '[]');
    localStorage.setItem(`food_${userId}_${dateStr}`, JSON.stringify([...existing, newItem]));

    try {
      const { data, error } = await supabase.from('food_items').insert([{
        user_id: userId,
        name: newItem.name,
        calories: newItem.calories,
        protein: newItem.protein,
        carbs: newItem.carbs,
        fats: newItem.fats,
        meal_type: newItem.mealType
      }]).select().single();
      
      if (error) throw error;
      return data as FoodItem;
    } catch (err) {
      console.error("Supabase food save failed:", err);
      return newItem;
    }
  },

  async deleteFoodItem(userId: string, itemId: string): Promise<void> {
    const dateStr = new Date().toISOString().split('T')[0];
    const existing = JSON.parse(localStorage.getItem(`food_${userId}_${dateStr}`) || '[]');
    localStorage.setItem(`food_${userId}_${dateStr}`, JSON.stringify(existing.filter((i: any) => i.id !== itemId)));

    try {
      await supabase.from('food_items').delete().eq('id', itemId);
    } catch (err) {
      console.error("Supabase food delete failed:", err);
    }
  }
};
