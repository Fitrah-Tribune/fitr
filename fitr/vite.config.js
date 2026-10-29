import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Say in the build log whether this build talks to Supabase, so a missing
  // Cloudflare variable shows up there instead of as a silent demo site.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const has = (k) => (env[k] ? 'set' : 'MISSING')
  console.log(`[fitr] Supabase: VITE_SUPABASE_URL ${has('VITE_SUPABASE_URL')}, VITE_SUPABASE_ANON_KEY ${has('VITE_SUPABASE_ANON_KEY')}`)
  return { plugins: [react()] }
})
