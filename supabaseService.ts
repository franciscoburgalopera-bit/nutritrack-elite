
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nqxcjpdwnrnqygpohczf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xeGNqcGR3bnJucXlncG9oY3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjI3ODYsImV4cCI6MjA4ODI5ODc4Nn0.CtGhImVn-wi2REEJT-oFdl5b4vNbV3-he3K4e32WNsM';

// Detect if the user is accidentally using a Stripe key (common mistake in this template)
const isStripeKey = SUPABASE_ANON_KEY.startsWith('sb_publishable_') || SUPABASE_ANON_KEY.startsWith('pk_');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || isStripeKey) {
  console.warn(
    isStripeKey 
      ? "CRITICAL: You are using a STRIPE key in the SUPABASE_ANON_KEY field. Please replace it with your Supabase 'anon' 'public' key."
      : "Supabase credentials missing. Authentication will not work until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      if (error.message.includes('fetch')) return { ok: false, message: "Network error: Cannot reach Supabase." };
      if (error.code === 'PGRST116') return { ok: true, message: "Connected (Profiles table empty)" };
      if (error.message.includes('relation "profiles" does not exist')) return { ok: true, message: "Connected (Schema missing)" };
      return { ok: false, message: `Supabase Error: ${error.message}` };
    }
    return { ok: true, message: "Connected to Supabase" };
  } catch (err: any) {
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
};
