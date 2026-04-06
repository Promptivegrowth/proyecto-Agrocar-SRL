import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ktvpoafwopcybuvbtmme.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnBvYWZ3b3BjeWJ1dmJ0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzg1MDMsImV4cCI6MjA5MDgxNDUwM30.RMyPjP2jsvzu8j_Hg6CUWh5MNsZI19cjH1yZ64tZfDE';

export const supabase = createClient(supabaseUrl, supabaseKey);
