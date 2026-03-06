-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  age INTEGER,
  gender TEXT,
  height DECIMAL,
  weight DECIMAL,
  activity_level TEXT,
  goal TEXT,
  target_weight DECIMAL,
  daily_calorie_target INTEGER,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Food Items Table
CREATE TABLE IF NOT EXISTS food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein DECIMAL DEFAULT 0,
  carbs DECIMAL DEFAULT 0,
  fats DECIMAL DEFAULT 0,
  serving_size TEXT,
  meal_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Profiles: Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Food Items: Users can only see and edit their own food logs
CREATE POLICY "Users can view own food" ON food_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food" ON food_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food" ON food_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food" ON food_items FOR DELETE USING (auth.uid() = user_id);
