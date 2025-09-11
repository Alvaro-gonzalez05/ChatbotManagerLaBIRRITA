import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null
let isWarmedUp = false

// Warm up Supabase connection on first load
async function warmUpSupabase(client: ReturnType<typeof createBrowserClient>) {
  if (isWarmedUp) return
  
  try {
    console.log('🔥 Warming up Supabase connection...')
    const startTime = Date.now()
    
    // Make a simple query to wake up the database
    await client.from('businesses').select('id').limit(1).single()
    
    const warmUpTime = Date.now() - startTime
    console.log(`✅ Supabase warmed up in ${warmUpTime}ms`)
    isWarmedUp = true
  } catch (error) {
    console.log('⚠️ Supabase warm-up failed (this is ok):', error)
    isWarmedUp = true // Mark as warmed up even if failed to avoid retries
  }
}

export function createClient() {
  // Use singleton pattern to avoid multiple connections
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    })
    throw new Error('Missing Supabase configuration')
  }
  
  console.log('Creating Supabase client with URL:', supabaseUrl)
  
  // Create client with optimized settings
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Optimize for SPA
      storageKey: 'la-birrita-auth', // Custom storage key
      storage: {
        getItem: (key: string) => {
          if (typeof window !== 'undefined') {
            return localStorage.getItem(key)
          }
          return null
        },
        setItem: (key: string, value: string) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem(key, value)
          }
        },
        removeItem: (key: string) => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(key)
          }
        }
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 2 // Limit realtime events to improve performance
      }
    }
  })
  
  // Start warming up the connection immediately
  warmUpSupabase(supabaseClient)
  
  return supabaseClient
}