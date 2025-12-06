import { createClient } from '@supabase/supabase-js'
import { proxyAgent } from '@/lib/proxy'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: proxyAgent ? (url: any, init: any) => fetch(url, { ...init, dispatcher: proxyAgent }) : undefined
  }
})

// Server-side Supabase client (bypasses RLS) - use only in API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    fetch: proxyAgent ? (url: any, init: any) => fetch(url, { ...init, dispatcher: proxyAgent }) : undefined
  }
})
