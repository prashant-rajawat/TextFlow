import { getSupabaseClient as getLibSupabaseClient } from '../../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseClient(): SupabaseClient | null {
  return getLibSupabaseClient();
}
