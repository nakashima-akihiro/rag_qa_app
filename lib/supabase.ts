import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 公開アクセス用（RLS 適用）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サーバーサイド管理用（RLS バイパス）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
