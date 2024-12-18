const { createClient } = window.supabase;

const supabaseUrl = "https://nzqgfemnuymacwdfagrs.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cWdmZW1udXltYWN3ZGZhZ3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzgxODcsImV4cCI6MjA1MDA1NDE4N30.cs27DPrrdGLhvxJV01hzZYJotx2T7Vn2cCcTe6IsByo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
