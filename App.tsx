
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, UserProfile, FoodItem, DailyLog, ChatMessage } from './types';
import Layout from './components/Layout';
import ProgressRing from './components/ProgressRing';
import { MOCK_RECOMMENDED_FOODS } from './constants';
import { parseFoodInput, getNutritionalInsights, NutritionalInsights, MealOption } from './geminiService';
import { supabase, checkSupabaseConnection } from './supabaseService';

// --- Global Sub-components ---

const Sidebar = ({ isOpen, onClose, user, onLogout, onNavigate }: { 
  isOpen: boolean, onClose: () => void, user: UserProfile | null, onLogout: () => void, onNavigate: (v: View) => void 
}) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-background-dark/80 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      <div className={`fixed top-0 left-0 h-full w-[280px] bg-background-dark border-r border-white/5 z-[101] shadow-2xl transition-transform duration-500 ease-out flex flex-col p-8 overflow-y-auto no-scrollbar ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-bold tracking-tight text-primary">ELITE OPS</h2>
          <button onClick={onClose} className="size-10 glass-card rounded-xl flex items-center justify-center text-white/40 active:scale-90 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-10 p-4 glass-card rounded-3xl border-primary/20">
          <div className="size-12 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20">
             {user?.avatarUrl ? (
               <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <span className="material-symbols-outlined text-primary">person</span>
             )}
          </div>
          <div>
            <p className="font-bold text-sm text-white truncate w-32">{user?.fullName || 'Warrior'}</p>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">{user?.goal || 'Elite'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', label: 'Command Center', icon: 'dashboard' },
            { id: 'diary', label: 'History Log', icon: 'book' },
            { id: 'analytics', label: 'Biometrics', icon: 'monitoring' },
            { id: 'profile', label: 'Elite Profile', icon: 'settings' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => { onNavigate(item.id as View); onClose(); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group"
            >
              <span className="material-symbols-outlined text-white/40 group-hover:text-primary transition-colors">{item.icon}</span>
              <span className="text-sm font-semibold text-white/70 group-hover:text-white">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-white/5 space-y-4">
          <button onClick={onLogout} className="w-full h-14 bg-accent/10 text-accent font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            <span className="material-symbols-outlined">logout</span>
            TERMINATE SESSION
          </button>
          <p className="text-[8px] text-white/20 font-bold uppercase text-center tracking-[0.4em]">NutriTRack Elite v1.2</p>
        </div>
      </div>
    </>
  );
};

const SplashView = () => (
  <div className="h-screen w-full flex items-center justify-center bg-fit-couple relative">
    <div className="absolute inset-0 bg-background-dark/90 backdrop-blur-md"></div>
    <div className="relative z-10 text-center animate-pulse">
      <h1 className="text-6xl font-black italic tracking-tighter text-white">NUTRITRACK <span className="text-primary text-glow">ELITE</span></h1>
      <div className="mt-8 flex justify-center"><div className="w-12 h-1 bg-primary rounded-full"></div></div>
    </div>
  </div>
);

const MacroBar = ({ label, current, target, color }: { label: string, current: number, target: number, color: string }) => {
  const progress = Math.min((current / target) * 100, 100);
  return (
    <div className="flex-1">
      <div className="flex justify-between items-end mb-1">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</span>
        <span className="text-[10px] font-bold text-white/80">{Math.round(current)}g</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]`} 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// --- View Components ---

const DashboardView = ({ user, todayLog, onAddFood, onOpenMenu, onOpenNotifications, insights }: any) => {
  const target = user?.dailyCalorieTarget || 2000;
  
  const macros = useMemo(() => {
    return todayLog.items.reduce((acc: any, item: any) => {
      acc.p += (item.protein || 0);
      acc.c += (item.carbs || 0);
      acc.f += (item.fats || 0);
      return acc;
    }, { p: 0, c: 0, f: 0 });
  }, [todayLog.items]);

  const targetMacros = {
    p: (target * 0.3) / 4,
    c: (target * 0.45) / 4,
    f: (target * 0.25) / 9,
  };

  return (
    <div className="p-6 space-y-8 pb-32 relative z-10">
      <header className="flex justify-between items-center h-14">
        <button 
          onClick={(e) => { e.stopPropagation(); onOpenMenu(); }} 
          className="size-11 flex items-center justify-center rounded-2xl glass-card hover:bg-white/10 transition-all active:scale-90 z-[70]"
        >
          <span className="material-symbols-outlined text-white">menu</span>
        </button>
        <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary text-glow italic">NUTRITRACK ELITE</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onOpenNotifications(); }}
          className="size-11 flex items-center justify-center rounded-2xl glass-card hover:bg-white/10 transition-all relative active:scale-90 z-[70]"
        >
          <span className="material-symbols-outlined text-white">notifications</span>
          <span className="absolute top-2.5 right-2.5 size-2 bg-accent rounded-full shadow-lg shadow-accent/50 animate-pulse"></span>
        </button>
      </header>

      <section>
        <h2 className="text-4xl font-black leading-tight tracking-tighter italic">
          Hello {user?.fullName?.split(' ')[0] || 'Warrior'},<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Push Limits!</span>
        </h2>
      </section>

      <section className="flex flex-col items-center">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-full scale-75 group-hover:scale-100 transition-transform duration-1000"></div>
          <ProgressRing current={todayLog.totalCalories} target={target} />
        </div>
        
        <div className="w-full mt-10 glass-card p-5 rounded-[32px] flex gap-6">
          <MacroBar label="Protein" current={macros.p} target={targetMacros.p} color="bg-secondary" />
          <MacroBar label="Carbs" current={macros.c} target={targetMacros.c} color="bg-primary" />
          <MacroBar label="Fats" current={macros.f} target={targetMacros.f} color="bg-accent" />
        </div>
      </section>

      {/* Recommended Elite Menu */}
      <section className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-bold tracking-tight italic">Strategic Fueling</h3>
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded animate-pulse">AI Optimized</span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {insights?.menuOptions ? [
                ...(insights.menuOptions.breakfast?.[0] ? [{...insights.menuOptions.breakfast[0], type: 'breakfast'}] : []),
                ...(insights.menuOptions.lunch?.[0] ? [{...insights.menuOptions.lunch[0], type: 'lunch'}] : []),
                ...(insights.menuOptions.dinner?.[0] ? [{...insights.menuOptions.dinner[0], type: 'dinner'}] : [])
            ].map((opt: any, i: number) => (
                <div key={i} className="glass-card shrink-0 p-5 rounded-[32px] border-white/5 relative overflow-hidden group hover:border-primary/30 transition-all w-64">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[8px] font-bold uppercase tracking-[0.3em] bg-white/5 px-2 py-1 rounded-md text-white/50">{opt.type}</span>
                        <p className="text-sm font-bold text-primary">{opt.calories} kcal</p>
                    </div>
                    <p className="text-sm font-bold tracking-tight text-white mb-2 leading-tight h-10 line-clamp-2">{opt.name}</p>
                    <div className="flex items-center justify-between mt-4">
                       <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest truncate">{opt.macros}</p>
                       <button onClick={() => onAddFood('add-food')} className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-background-dark transition-all">
                          <span className="material-symbols-outlined text-sm">add</span>
                       </button>
                    </div>
                </div>
            )) : (
              <div className="flex gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="glass-card shrink-0 p-5 rounded-[32px] w-64 border-white/5 animate-pulse bg-white/5 h-36">
                      <div className="h-3 w-12 bg-white/5 rounded mb-4"></div>
                      <div className="h-5 w-full bg-white/5 rounded mb-2"></div>
                      <div className="h-3 w-2/3 bg-white/5 rounded"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-xl font-bold tracking-tight italic">Common Snacks</h3>
          <button onClick={() => onAddFood('add-food')} className="text-primary text-[10px] font-bold uppercase tracking-widest">See All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {MOCK_RECOMMENDED_FOODS.map(food => (
            <button 
              key={food.id}
              onClick={() => onAddFood('add-food')}
              className="glass-card shrink-0 p-3 rounded-[28px] w-32 flex flex-col items-center gap-2 group hover:border-primary/50 transition-all"
            >
              <div className="size-16 rounded-2xl overflow-hidden shadow-lg border border-white/5">
                <img src={food.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt={food.name} />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold tracking-tight truncate w-24">{food.name}</p>
                <p className="text-[9px] font-bold text-primary">{food.calories} kcal</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [view, setView] = useState<View>('splash');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [globalInsights, setGlobalInsights] = useState<NutritionalInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Auth inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayLog = useMemo(() => logs.find(l => l.date === todayStr) || { date: todayStr, items: [], totalCalories: 0 }, [logs, todayStr]);

  useEffect(() => {
    const handleSkip = (e: any) => {
      setUser(e.detail);
      setLogs([{ date: todayStr, items: [], totalCalories: 0 }]);
      setView('dashboard');
    };
    window.addEventListener('skip-login', handleSkip);
    return () => window.removeEventListener('skip-login', handleSkip);
  }, [todayStr]);

  useEffect(() => {
    const checkConn = async () => {
      const status = await checkSupabaseConnection();
      setSupabaseStatus(status);
      if (!status.ok) {
        console.error("Supabase Connection Issue:", status.message);
      }
    };
    checkConn();

    const init = async () => {
      // Guaranteed transition to login if nothing happens in 4 seconds
      const backupTimer = setTimeout(() => {
        if (view === 'splash') setView('login');
      }, 4000);

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data?.session) {
          await fetchUserData(data.session.user.id, data.session.user.email);
        } else {
          setView('login');
        }
      } catch (err) {
        console.error("Initialization failed:", err);
        setView('login');
      } finally {
        clearTimeout(backupTimer);
      }
    };
    init();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session) {
          await fetchUserData(session.user.id, session.user.email);
        } else {
          setUser(null);
          setLogs([]);
          setView('login');
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setView('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Debounced insights call to prevent 429
  useEffect(() => {
    if (!user) return;
    
    const timer = setTimeout(async () => {
      setInsightsLoading(true);
      try {
        const data = await getNutritionalInsights(todayLog.items, user);
        if (data) setGlobalInsights(data);
      } catch (e: any) {
        console.error("Failed to load insights", e);
        if (e?.message?.includes('429')) {
           console.warn("Gemini Quota Exceeded. Retrying in 30 seconds...");
        }
      } finally {
        setInsightsLoading(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [user?.id, todayLog.items.length]);

  const fetchUserData = async (userId: string, email?: string) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
      const profileData: UserProfile = {
        id: profile.id, fullName: profile.full_name, email: profile.email || email || '',
        phoneNumber: profile.phone_number, age: profile.age, gender: profile.gender,
        height: Number(profile.height), weight: Number(profile.weight),
        activityLevel: profile.activity_level, goal: profile.goal,
        targetWeight: Number(profile.target_weight), dailyCalorieTarget: profile.daily_calorie_target,
        avatarUrl: profile.avatar_url
      };
      setUser(profileData);
      if (!profile.age || !profile.height || !profile.weight) setView('onboarding');
      else {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: foodData } = await supabase.from('food_items').select('*').eq('user_id', userId).gte('created_at', startOfDay.toISOString());
        if (foodData) {
          setLogs([{ date: todayStr, items: foodData as FoodItem[], totalCalories: foodData.reduce((sum, item) => sum + item.calories, 0) }]);
        }
        setView('dashboard');
      }
    } else {
      setUser({
        id: userId, email: email || '', fullName: 'Warrior', age: 0, gender: 'male',
        height: 0, weight: 0, activityLevel: 'moderately_active', goal: 'maintain',
        targetWeight: 0, dailyCalorieTarget: 2000
      });
      setView('onboarding');
    }
    } catch (err) {
      console.error("fetchUserData error:", err);
      setView('onboarding');
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Moderate compression
        };
      };
      reader.onerror = reject;
    });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const compressedBase64 = await compressImage(file);
      
      // Update UI immediately for snappiness
      setUser(prev => prev ? { ...prev, avatarUrl: compressedBase64 } : null);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: compressedBase64 })
        .eq('id', user.id);

      if (error) throw error;
      
      console.log("Avatar saved to database successfully");
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: string, p: string) => {
    if (!e || !p) {
      alert("Please enter credentials.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) {
        console.error("Login Error:", error);
        if (error.message.toLowerCase().includes('confirm')) {
          setShowResend(true);
          alert("Email not confirmed. Please check your inbox (and spam) for the confirmation link. You cannot log in until you click that link. I've added a button below to resend it if needed.");
        } else if (error.message.toLowerCase().includes('invalid login')) {
          alert("Invalid email or password. Please try again.");
        } else {
          alert(`Login Failed: ${error.message}`);
        }
      } else if (data.session) {
        console.log("Login successful:", data.session.user.email);
        // fetchUserData will be triggered by onAuthStateChange, but we can call it here for speed
        await fetchUserData(data.session.user.id, data.session.user.email);
      }
    } catch (err: any) {
      console.error("Critical Login Error:", err);
      alert("Connection error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!emailInput) {
      alert("Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailInput,
      });
      if (error) alert(error.message);
      else alert("Confirmation email sent! Please check your inbox.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipLogin = () => {
    const localUser: UserProfile = {
      id: 'local-warrior-' + Math.random().toString(36).substr(2, 9),
      fullName: 'Local Warrior',
      email: emailInput || 'local@nutritrack.elite',
      age: 25,
      gender: 'male',
      height: 175,
      weight: 75,
      activityLevel: 'moderately_active',
      goal: 'maintain',
      targetWeight: 75,
      dailyCalorieTarget: 2200
    };
    setUser(localUser);
    setLogs([{ 
      date: todayStr, 
      items: [], 
      totalCalories: 0 
    }]);
    setView('dashboard');
    alert("Entered in Local Mode. Note: Data will not be synced to the cloud.");
  };

  const handleDemoMode = () => {
    const demoUser: UserProfile = {
      id: 'demo-warrior',
      fullName: 'Elite Warrior',
      email: 'demo@nutritrack.elite',
      age: 28,
      gender: 'male',
      height: 180,
      weight: 85,
      activityLevel: 'very_active',
      goal: 'gain',
      targetWeight: 90,
      dailyCalorieTarget: 3200
    };
    setUser(demoUser);
    setLogs([{ 
      date: todayStr, 
      items: MOCK_RECOMMENDED_FOODS.slice(0, 2).map(f => ({ ...f, userId: 'demo-warrior', mealType: 'breakfast', createdAt: new Date().toISOString() })), 
      totalCalories: MOCK_RECOMMENDED_FOODS.slice(0, 2).reduce((s, f) => s + f.calories, 0) 
    }]);
    setView('dashboard');
  };

  const handleRegister = async (e: string, p: string, n: string) => {
    if (!e || !p || !n) {
      alert("Please fill all fields.");
      return;
    }
    setLoading(true);
    try {
      console.log("Attempting registration for:", e);
      const { data, error } = await supabase.auth.signUp({ 
        email: e, 
        password: p, 
        options: { 
          data: { full_name: n },
          emailRedirectTo: window.location.origin
        } 
      });
      
      if (error) {
        console.error("Registration Error:", error);
        alert("Registration Error: " + error.message);
      } else { 
        console.log("Registration successful:", data);
        if (data.session) {
          // Email confirmation is OFF, user is logged in automatically
          alert("Registration successful! Welcome to NutriTrack Elite.");
          await fetchUserData(data.session.user.id, data.session.user.email);
        } else {
          // Email confirmation is ON
          alert("SUCCESS! Mission control activated. IMPORTANT: Check your email (" + e + ") and click the confirmation link to activate your account. You cannot log in until you do this."); 
          setView('login'); 
        }
      }
    } catch (err: any) {
      console.error("Critical Registration Error:", err);
      alert("Critical registration error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFoodItem = async (id: string) => {
    const { error } = await supabase.from('food_items').delete().eq('id', id);
    if (error) alert(error.message);
    else setLogs(prev => prev.map(l => ({ ...l, items: l.items.filter(i => i.id !== id), totalCalories: l.items.filter(i => i.id !== id).reduce((s, i) => s + i.calories, 0) })));
  };

  const renderContent = () => {
    switch (view) {
      case 'splash': return <SplashView />;
      case 'login': return (
        <div className="h-full flex flex-col p-8 justify-center max-w-sm mx-auto bg-fit-couple relative">
          <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"></div>
          
          {/* Connection Status Badge */}
          {supabaseStatus && !supabaseStatus.ok && (
            <div className="absolute top-4 left-4 right-4 z-50 bg-accent/20 border border-accent/40 p-3 rounded-2xl backdrop-blur-md flex items-center gap-3">
              <span className="material-symbols-outlined text-accent animate-pulse">warning</span>
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{supabaseStatus.message}</p>
            </div>
          )}

          <div className="relative z-10 w-full text-center">
            <h1 className="text-7xl font-black mb-2 tracking-tighter text-white italic drop-shadow-2xl">Nutri<br/><span className="text-primary text-glow">TRack</span></h1>
            <p className="text-white/60 mb-10 text-xs font-bold uppercase tracking-[0.3em]">Login to continue session.</p>
            <div className="space-y-4">
              <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="Email Identity" className="w-full h-16 bg-white border-4 border-primary/20 rounded-[28px] px-8 text-slate-950 font-bold shadow-2xl focus:border-primary transition-all outline-none" />
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Secure Password" className="w-full h-16 bg-white border-4 border-primary/20 rounded-[28px] px-8 text-slate-950 font-bold shadow-2xl focus:border-primary transition-all outline-none" />
              
              <button onClick={() => handleLogin(emailInput, passwordInput)} disabled={loading} className="w-full h-18 bg-gradient-to-r from-primary to-secondary text-slate-900 font-bold rounded-full shadow-2xl mt-8 active:scale-95 transition-all text-xl uppercase tracking-widest py-5">
                {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Sign In'}
              </button>

              {showResend && (
                <button onClick={handleResendConfirmation} className="w-full mt-4 text-primary text-[10px] font-bold uppercase tracking-widest hover:underline">
                  Resend Confirmation Email
                </button>
              )}

              <button 
                onClick={handleSkipLogin}
                className="w-full h-16 bg-primary text-background-dark font-black rounded-full shadow-[0_0_20px_rgba(0,255,157,0.3)] mt-4 active:scale-95 transition-all text-lg uppercase tracking-widest py-4 border-4 border-white/20"
              >
                Skip Login (Local Mode)
              </button>
              
              <div className="flex items-center gap-4 my-4">
                <div className="h-[1px] flex-1 bg-white/10"></div>
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">OR</span>
                <div className="h-[1px] flex-1 bg-white/10"></div>
              </div>

              <button 
                onClick={handleDemoMode}
                className="w-full h-14 bg-white/5 border border-white/10 text-white font-bold rounded-full active:scale-95 transition-all text-sm uppercase tracking-widest hover:bg-white/10"
              >
                Enter as Guest (Demo)
              </button>

              <button 
                onClick={() => setView('register')}
                className="w-full h-14 bg-secondary/10 border border-secondary/30 text-secondary font-bold rounded-full active:scale-95 transition-all text-sm uppercase tracking-widest hover:bg-secondary/20"
              >
                Create New Account
              </button>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Trouble Logging In?</p>
              <p className="text-[9px] text-white/20 leading-relaxed px-8 mb-4">
                If you just registered, you MUST click the confirmation link in your email before you can sign in. Check your spam folder.
              </p>
              <button 
                onClick={handleResendConfirmation}
                className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline"
              >
                Resend Confirmation Email
              </button>
            </div>

            <button onClick={() => setView('login')} className="w-full mt-12 text-white/20 text-[10px] font-bold uppercase tracking-[0.4em]">NutriTRack Elite v1.2</button>
          </div>
        </div>
      );
      case 'dashboard': return <Layout currentView={view} onNavigate={setView}><DashboardView user={user} todayLog={todayLog} onAddFood={setView} onOpenMenu={() => setIsMenuOpen(true)} onOpenNotifications={() => alert("Notification center active. No new alerts.")} insights={globalInsights} /></Layout>;
      case 'diary': return (
        <Layout currentView={view} onNavigate={setView}>
          <div className="p-6 h-full relative z-10">
            <h2 className="text-3xl font-black tracking-tight mb-8 italic">History Log</h2>
            <div className="space-y-4">
              {todayLog.items.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <span className="material-symbols-outlined text-6xl mb-4">history</span>
                  <p className="font-bold uppercase tracking-widest text-xs">No entries for today</p>
                </div>
              ) : todayLog.items.map(i => (
                <div key={i.id} className="glass-card p-4 rounded-[28px] flex justify-between items-center border-white/5 shadow-xl transition-all hover:border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-xl">fitness_center</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{i.name}</p>
                      <p className="text-[10px] uppercase text-white/40 font-semibold tracking-wider">{i.mealType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-primary italic text-glow text-sm">{i.calories} kcal</span>
                    <button onClick={() => handleDeleteFoodItem(i.id)} className="size-8 rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white transition-all flex items-center justify-center active:scale-90">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Layout>
      );
      case 'analytics': return (
        <Layout currentView={view} onNavigate={setView}>
          <div className="p-6 space-y-10 pb-40 relative z-10">
            <header className="flex flex-col items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Biometric Audit</span>
              <h2 className="text-3xl font-black tracking-tight drop-shadow-lg italic">Strategic Planning</h2>
            </header>
            {insightsLoading ? (
               <div className="flex flex-col items-center justify-center py-24 space-y-4">
                 <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Calculating Menus...</p>
               </div>
            ) : (
              <div className="space-y-12">
                <section className="glass-card p-6 rounded-[40px] border-white/10 bg-gradient-to-br from-white/5 to-transparent">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-3">Precision Report</h4>
                  <p className="text-sm font-semibold text-white/90 leading-relaxed italic">"{globalInsights?.precisionReport || 'Analyzing baseline biometrics...'}"</p>
                </section>
                
                {['Breakfast', 'Lunch', 'Dinner'].map(meal => (
                  <div key={meal} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">{meal} PROTOCOLS</h4>
                      <div className="h-[1px] flex-1 bg-white/5"></div>
                    </div>
                    <div className="grid gap-4">
                      {(globalInsights?.menuOptions as any)?.[meal.toLowerCase()]?.map((opt: MealOption, idx: number) => (
                        <div key={idx} className="glass-card p-6 rounded-[32px] border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-base font-bold tracking-tight flex-1 text-white pr-4 leading-tight">{opt.name}</p>
                            <p className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{opt.calories} kcal</p>
                          </div>
                          <div className="flex gap-2 mb-3">
                             <span className="text-[9px] font-bold text-white/40 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5 tracking-widest">{opt.macros}</span>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed font-medium italic">"{opt.reason}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Layout>
      );
      case 'profile': return <Layout currentView={view} onNavigate={setView}><ProfileView user={user} onLogout={handleLogout} onBack={() => setView('dashboard')} onRecalculate={() => setView('onboarding')} onAvatarUpload={handleAvatarUpload} loading={loading} /></Layout>;
      case 'add-food': return <AddFoodView onBack={() => setView('dashboard')} onAddFoodItem={handleAddFoodItem} onAIChat={() => setView('ai-chat')} />;
      case 'ai-chat': return <AIChatView onBack={() => setView('add-food')} onAddFoodItem={handleAddFoodItem} messages={messages} isLoadingAI={isLoadingAI} handleAIChat={handleAIChatCall} />;
      case 'register': return <RegisterView onBack={() => setView('login')} onRegister={handleRegister} loading={loading} />;
      case 'onboarding': return <OnboardingView user={user} onComplete={() => fetchUserData(user!.id)} onCancel={() => setView('dashboard')} />;
      default: return <div className="h-full flex items-center justify-center"><p className="text-white/20 font-bold uppercase tracking-[0.5em]">Module Offline</p></div>;
    }
  };

  const handleLogout = async () => {
    try {
      if (user?.id.startsWith('local-warrior-') || user?.id === 'demo-warrior') {
        // Local/Demo logout: just reset state
        setUser(null);
        setLogs([]);
        setView('login');
      } else {
        // Real account logout
        await supabase.auth.signOut();
      }
      setIsMenuOpen(false);
    } catch (err) {
      console.error("Logout error:", err);
      // Fallback: force reset
      setUser(null);
      setView('login');
    }
  };

  const handleAddFoodItem = async (item: any) => {
    if (!user) return;
    const { data, error } = await supabase.from('food_items').insert([{
        user_id: user.id, name: item.name, calories: item.calories, protein: item.protein || 0,
        carbs: item.carbs || 0, fats: item.fats || 0, serving_size: item.servingSize, meal_type: item.mealType
      }]).select().single();
    if (error) alert(error.message);
    else if (data) {
      setLogs(prev => {
        const existing = prev.find(l => l.date === todayStr);
        if (existing) return prev.map(l => l.date === todayStr ? { ...l, items: [...l.items, data as FoodItem], totalCalories: l.totalCalories + data.calories } : l);
        return [...prev, { date: todayStr, items: [data as FoodItem], totalCalories: data.calories }];
      });
      setView('dashboard');
    }
  };

  const handleAIChatCall = async (input: string) => {
    if (!input.trim()) return;
    const newMsg: ChatMessage[] = [...messages, { role: 'user', content: input }];
    setMessages(newMsg);
    setIsLoadingAI(true);
    const res = await parseFoodInput(input);
    if (res === "QUOTA_EXCEEDED") {
      setMessages([...newMsg, { role: 'ai', content: "Our AI brain is a bit busy (Quota Exceeded). Please try again in 60 seconds." }]);
    } else if (res) {
      setMessages([...newMsg, { role: 'ai', content: "Calculated macros for your entry:", structuredData: res }]);
    } else {
      setMessages([...newMsg, { role: 'ai', content: "Failed to parse. Please specify amount and fuel type." }]);
    }
    setIsLoadingAI(false);
  };

  return (
    <div className="h-screen w-full bg-background-dark overflow-hidden font-sans select-none relative">
      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} user={user} onLogout={handleLogout} onNavigate={setView} />
      {renderContent()}
    </div>
  );
};

// --- View Sub-components ---

const AddFoodView = ({ onBack, onAddFoodItem, onAIChat }: any) => (
  <div className="h-full flex flex-col p-6 bg-fit-couple relative overflow-hidden">
    <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-md"></div>
    <header className="relative z-10 flex items-center justify-between mb-8">
      <button onClick={onBack} className="size-11 glass-card rounded-2xl flex items-center justify-center active:scale-90 transition-all"><span className="material-symbols-outlined">arrow_back</span></button>
      <h2 className="font-bold text-xl tracking-tight italic">Log Fuel</h2>
      <div className="size-11"></div>
    </header>
    <div className="relative z-10 space-y-6 flex-1">
      <button onClick={onAIChat} className="w-full h-20 bg-gradient-to-r from-secondary to-primary text-background-dark font-bold rounded-[28px] flex items-center justify-center gap-3 shadow-xl uppercase tracking-widest text-lg italic active:scale-95 transition-all">
        <span className="material-symbols-outlined font-black">auto_awesome</span> AI Voice/Text Log
      </button>
      <div className="space-y-4 overflow-y-auto no-scrollbar pb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 px-2">Popular Elite Fuels</h3>
        <div className="grid gap-3">
          {MOCK_RECOMMENDED_FOODS.map(food => (
            <div key={food.id} className="glass-card p-4 rounded-[32px] flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl overflow-hidden border border-white/5 shadow-lg"><img src={food.image} className="w-full h-full object-cover" /></div>
                <div><p className="font-bold tracking-tight">{food.name}</p><p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{food.calories} kcal</p></div>
              </div>
              <button onClick={() => onAddFoodItem({ name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fats: food.fats, servingSize: food.serving, mealType: 'snack' })} className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-all hover:bg-primary hover:text-background-dark"><span className="material-symbols-outlined">add</span></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AIChatView = ({ onBack, messages, isLoadingAI, handleAIChat, onAddFoodItem }: any) => {
  const [input, setInput] = useState('');
  return (
    <div className="h-full flex flex-col p-6 bg-fit-woman relative">
      <div className="absolute inset-0 bg-background-dark/85 backdrop-blur-xl"></div>
      <header className="relative z-10 flex items-center justify-between mb-6">
        <button onClick={onBack} className="size-11 glass-card rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined">arrow_back</span></button>
        <h2 className="font-bold text-xl tracking-tight italic text-glow text-primary">AI Assistant</h2>
        <div className="size-11"></div>
      </header>
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar py-4 space-y-6">
        {messages.map((m: any, idx: number) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-[28px] ${m.role === 'user' ? 'bg-primary text-background-dark font-bold shadow-lg shadow-primary/20' : 'glass-card border-white/10'}`}>
              <p className="text-sm">{m.content}</p>
              {m.structuredData && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  {m.structuredData.foods.map((f: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/60">{f.name}</span>
                      <span className="text-primary">{f.calories} kcal</span>
                    </div>
                  ))}
                  <button onClick={() => onAddFoodItem({ name: m.structuredData?.foods[0].name, calories: m.structuredData?.totalCalories, protein: 0, carbs: 0, fats: 0, servingSize: "AI Est", mealType: 'lunch' })} className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-background-dark text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all shadow-xl">Confirm & Sync</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoadingAI && <div className="p-4 glass-card rounded-2xl animate-pulse text-[10px] font-bold uppercase tracking-widest text-primary italic">Analyzing mission data...</div>}
      </div>
      <div className="relative z-10 pt-4 pb-2">
          <div className="bg-white rounded-[32px] p-2 flex gap-2 border-4 border-primary/20 focus-within:border-primary transition-all">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && input) { handleAIChat(input); setInput(''); } }} placeholder="Describe your fuel intake..." className="flex-1 bg-transparent border-none text-sm font-bold text-slate-950 pl-4 focus:ring-0" />
              <button onClick={() => { if(input) { handleAIChat(input); setInput(''); } }} className="size-12 bg-primary rounded-2xl flex items-center justify-center text-background-dark active:scale-90 transition-all shadow-lg"><span className="material-symbols-outlined font-black">send</span></button>
          </div>
      </div>
    </div>
  );
};

const ProfileView = ({ user, onLogout, onBack, onRecalculate, onAvatarUpload, loading }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (loading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAvatarUpload(file);
    }
  };

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="size-12 glass-card rounded-2xl flex items-center justify-center active:scale-90">
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>
        <h2 className="font-bold text-xl tracking-tight italic">Elite Profile</h2>
        <div className="size-12"></div>
      </header>
      
      <div className="p-6 flex flex-col items-center">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />
        
        <div 
          onClick={handleAvatarClick}
          className={`size-40 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full flex items-center justify-center border-4 border-white/10 overflow-hidden mb-8 shadow-2xl relative cursor-pointer group hover:border-primary/50 transition-all ${loading ? 'opacity-50 cursor-wait' : ''}`}
        >
          <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover z-10" />
          ) : (
            <span className="material-symbols-outlined text-7xl text-white/30 z-10">person</span>
          )}
          
          {loading ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
               <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
            </div>
          )}
        </div>
        
        <h3 className="text-3xl font-bold tracking-tight mb-1 italic">{user?.fullName || 'Elite User'}</h3>
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">{user?.email}</p>
        
        <div className="w-full space-y-4 mb-10">
          <div className="glass-card p-6 rounded-[32px] flex justify-between items-center border-primary/20 shadow-xl">
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Elite Daily Target</p>
              <p className="text-3xl font-black text-primary italic tracking-tighter">{user?.dailyCalorieTarget} kcal</p>
            </div>
            <button onClick={onRecalculate} className="size-12 glass-card rounded-2xl flex items-center justify-center text-primary active:scale-90 shadow-lg shadow-primary/10">
              <span className="material-symbols-outlined">edit_note</span>
            </button>
          </div>
        </div>
        
        <button onClick={onLogout} className="w-full h-16 bg-accent/5 border border-accent/20 text-accent font-bold rounded-[32px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-accent/5">
          Terminate Protocol
        </button>
      </div>
    </div>
  );
};

const RegisterView = ({ onBack, onRegister, loading }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-full flex flex-col p-8 justify-center max-w-sm mx-auto bg-fit-couple relative">
      <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm"></div>
      <div className="relative z-10 w-full text-center">
        <h1 className="text-5xl font-black mb-2 tracking-tighter text-white italic drop-shadow-2xl">JOIN THE <span className="text-primary text-glow">ELITE</span></h1>
        <p className="text-white/60 mb-10 text-xs font-bold uppercase tracking-[0.3em]">Initialize your profile.</p>
        <div className="space-y-4 text-left">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full h-16 bg-white border-4 border-primary/20 rounded-[28px] px-8 text-slate-950 font-bold shadow-2xl" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Identity" className="w-full h-16 bg-white border-4 border-primary/20 rounded-[28px] px-8 text-slate-950 font-bold shadow-2xl" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Secure Password" className="w-full h-16 bg-white border-4 border-primary/20 rounded-[28px] px-8 text-slate-950 font-bold shadow-2xl" />
          <button onClick={() => onRegister(email, password, name)} disabled={loading} className="w-full h-18 bg-gradient-to-r from-primary to-secondary text-slate-900 font-bold rounded-full shadow-2xl mt-8 active:scale-95 transition-all text-xl uppercase tracking-widest py-5">
            {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Enlist Now'}
          </button>
        </div>

        <div className="flex items-center gap-4 my-6">
          <div className="h-[1px] flex-1 bg-white/10"></div>
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">OR</span>
          <div className="h-[1px] flex-1 bg-white/10"></div>
        </div>

        <button 
          onClick={() => {
            const localUser = {
              id: 'local-warrior-' + Math.random().toString(36).substr(2, 9),
              fullName: name || 'Local Warrior',
              email: email || 'local@nutritrack.elite',
              age: 25, gender: 'male', height: 175, weight: 75,
              activityLevel: 'moderately_active', goal: 'maintain',
              targetWeight: 75, dailyCalorieTarget: 2200
            };
            // This is a bit hacky but works for instant access
            window.dispatchEvent(new CustomEvent('skip-login', { detail: localUser }));
          }}
          className="w-full h-14 bg-primary text-background-dark font-black rounded-full active:scale-95 transition-all text-sm uppercase tracking-widest hover:bg-primary/90"
        >
          Skip & Enter Now (Local)
        </button>

        <button onClick={onBack} className="w-full mt-8 text-white/50 text-xs font-bold uppercase tracking-[0.2em] hover:text-primary transition-colors">Already registered? Log In</button>
      </div>
    </div>
  );
};

const OnboardingView = ({ user, onComplete, onCancel }: { user: UserProfile | null, onComplete: () => void, onCancel?: () => void }) => {
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    age: 25,
    gender: 'male' as 'male' | 'female' | 'other',
    height: 175,
    weight: 70,
    activityLevel: 'moderately_active' as UserProfile['activityLevel'],
    goal: 'maintain' as UserProfile['goal'],
  });

  const handleFinish = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    
    try {
      // Calculate BMR (Mifflin-St Jeor)
      let bmr = (10 * profileData.weight) + (6.25 * profileData.height) - (5 * profileData.age);
      if (profileData.gender === 'male') bmr += 5;
      else bmr -= 161;

      // Activity Multiplier
      const multipliers: any = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extremely_active: 1.9
      };
      let tdee = bmr * (multipliers[profileData.activityLevel] || 1.2);

      // Goal adjustment
      if (profileData.goal === 'lose') tdee -= 500;
      if (profileData.goal === 'gain') tdee += 500;

      const target = Math.round(tdee);

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        age: profileData.age,
        gender: profileData.gender,
        height: profileData.height,
        weight: profileData.weight,
        activity_level: profileData.activityLevel,
        goal: profileData.goal,
        target_weight: profileData.weight,
        daily_calorie_target: target
      });

      if (error) {
        alert("Failed to save profile: " + error.message);
      } else {
        onComplete();
      }
    } catch (e) {
      console.error("Critical onboarding error:", e);
      alert("A critical error occurred while finalizing.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 bg-background-dark text-white overflow-y-auto no-scrollbar">
      <header className="mb-12 flex justify-between items-start">
        <h2 className="text-4xl font-black italic tracking-tighter">PHASE {step + 1}<br/><span className="text-primary uppercase tracking-[0.2em] text-sm font-bold">Bio-Calibration</span></h2>
        {onCancel && (
          <button onClick={onCancel} className="size-11 glass-card rounded-2xl flex items-center justify-center active:scale-90 transition-all">
            <span className="material-symbols-outlined text-white">close</span>
          </button>
        )}
      </header>
      
      <div className="flex-1 space-y-8">
        {step === 0 && (
          <div className="space-y-6">
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Physical Metrics</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase">Age</label>
                <input type="number" value={profileData.age} onChange={e => setProfileData({...profileData, age: parseInt(e.target.value) || 0})} className="w-full h-14 bg-white/5 rounded-2xl px-6 font-bold border border-white/10" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase">Gender</label>
                <select value={profileData.gender} onChange={e => setProfileData({...profileData, gender: e.target.value as any})} className="w-full h-14 bg-white/5 rounded-2xl px-6 font-bold border border-white/10 text-white focus:ring-primary focus:border-primary">
                  <option value="male" className="bg-slate-900 text-white">Male</option>
                  <option value="female" className="bg-slate-900 text-white">Female</option>
                  <option value="other" className="bg-slate-900 text-white">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase">Height (cm)</label>
                <input type="number" value={profileData.height} onChange={e => setProfileData({...profileData, height: parseInt(e.target.value) || 0})} className="w-full h-14 bg-white/5 rounded-2xl px-6 font-bold border border-white/10" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/50 uppercase">Weight (kg)</label>
                <input type="number" value={profileData.weight} onChange={e => setProfileData({...profileData, weight: parseInt(e.target.value) || 0})} className="w-full h-14 bg-white/5 rounded-2xl px-6 font-bold border border-white/10" />
              </div>
            </div>
            <button onClick={() => setStep(1)} className="w-full h-16 bg-primary text-background-dark font-bold rounded-2xl uppercase tracking-widest mt-4 active:scale-95 transition-all">Next Phase</button>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Lifestyle & Objectives</p>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase">Activity Level</label>
              <select value={profileData.activityLevel} onChange={e => setProfileData({...profileData, activityLevel: e.target.value as any})} className="w-full h-14 bg-white/5 rounded-2xl px-6 font-bold border border-white/10 text-white focus:ring-primary focus:border-primary">
                <option value="sedentary" className="bg-slate-900 text-white">Sedentary</option>
                <option value="lightly_active" className="bg-slate-900 text-white">Lightly Active</option>
                <option value="moderately_active" className="bg-slate-900 text-white">Moderately Active</option>
                <option value="very_active" className="bg-slate-900 text-white">Very Active</option>
                <option value="extremely_active" className="bg-slate-900 text-white">Extremely Active</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase">Mission Objective</label>
              <select value={profileData.goal} onChange={e => setProfileData({...profileData, goal: e.target.value as any})} className="w-full h-14 bg-white/5 rounded-2xl px-6 font-bold border border-white/10 text-white focus:ring-primary focus:border-primary">
                <option value="lose" className="bg-slate-900 text-white">Fat Loss</option>
                <option value="maintain" className="bg-slate-900 text-white">Maintenance</option>
                <option value="gain" className="bg-slate-900 text-white">Muscle Gain</option>
              </select>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                disabled={isSaving}
                onClick={() => setStep(0)} 
                className="flex-1 h-16 bg-white/5 text-white/50 font-bold rounded-2xl uppercase tracking-widest border border-white/10 active:scale-95 transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button 
                disabled={isSaving}
                onClick={handleFinish} 
                className="flex-[2] h-16 bg-gradient-to-r from-primary to-secondary text-background-dark font-bold rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    SAVING...
                  </>
                ) : 'FINALIZE'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
