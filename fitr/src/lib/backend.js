import { createClient } from '@supabase/supabase-js'

// Set these in Cloudflare Pages (Settings → Environment variables) and in
// fitr/.env.local for local work. Both are safe to be public: the database
// rules in supabase/schema.sql decide what anyone can do. Without them the
// site runs as the in-browser demo.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

const client = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
  : null

window.__fitrBackend?.(client)
