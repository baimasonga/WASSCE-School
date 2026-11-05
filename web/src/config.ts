// Public Supabase settings (the publishable key is safe in the browser: data is protected by row-level security
// and by the API's own checks). Override at build time with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vdcnrkmoqoxhhpsrmydo.supabase.co";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_lyjCa5xfAo_B7458GnmkIw_M2C14GFI";
export const APK_URL = "https://github.com/baimasonga/WASSCE-School/releases/latest/download/WASSCE-School.apk";
export const RELEASES_URL = "https://github.com/baimasonga/WASSCE-School/releases";
export const EXAM_QUESTIONS = 50;
export const EXAM_MS = 90 * 60_000;
