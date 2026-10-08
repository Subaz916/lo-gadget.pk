import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'

export const SUPABASE_URL = 'https://hmfopnkzjebdosporvbn.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZm9wbmt6amViZG9zcG9ydmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NDU3OTksImV4cCI6MjEwNzAyMTc5OX0.nvm83OlAVVxtIkn8HzXSenoF_0L1jqrXbN3T2Sl9b2k'

export const isConfigured = !/YOUR_PROJECT|YOUR_SUPABASE_ANON_KEY/.test(
  SUPABASE_URL + ' ' + SUPABASE_ANON_KEY
)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})
