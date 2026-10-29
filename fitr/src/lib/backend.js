import { createClient } from '@supabase/supabase-js'

// Set these in Cloudflare Pages (Settings → Environment variables) and in
// fitr/.env.local for local work. Both are safe to be public: the database
// rules in supabase/schema.sql decide what anyone can do. Without them the
// site runs as the in-browser demo.
// Only the project address counts (https://<id>.supabase.co); a pasted
// callback or dashboard link would otherwise break every request.
const url = (() => {
  try { return new URL(import.meta.env.VITE_SUPABASE_URL).origin } catch { return '' }
})()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

const client = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
  : null

console.info(client ? '[FITR] Using Supabase' : '[FITR] Demo mode: no Supabase keys in this build')
window.__fitrBackend?.(client)
