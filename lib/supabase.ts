import { createClient } from '@supabase/supabase-js'
import { HttpsProxyAgent } from 'https-proxy-agent'
import fetch from 'node-fetch'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Set up proxy for Supabase connections
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined

// Custom fetch function with proxy support
const customFetch = proxyAgent
  ? (url: RequestInfo, options: RequestInit = {}) => {
      return fetch(url as any, {
        ...options,
        agent: proxyAgent,
      } as any)
    }
  : undefined

const globalOptions = customFetch
  ? {
      global: {
        fetch: customFetch as any,
      },
    }
  : {}

// Client-side Supabase client (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, globalOptions)

// Server-side Supabase client (bypasses RLS) - use only in API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  ...globalOptions
})
