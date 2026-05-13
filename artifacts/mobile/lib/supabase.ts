import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://mqupfhbtjxpbraioanml.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xdXBmaGJ0anhwYnJhaW9hbm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDQwMDgsImV4cCI6MjA5NDA4MDAwOH0.ng3_DaQulU-H2_gcoG6kF2MlsHqH-IANOJgw0WByxeE";

const isBrowser = typeof window !== "undefined";
const ssrStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isBrowser ? AsyncStorage : ssrStorage,
    autoRefreshToken: isBrowser,
    persistSession: isBrowser,
    detectSessionInUrl: false,
  },
});
