import { createClient } from '@supabase/supabase-js'

// Tipos para la base de datos
export interface Database {
  public: {
    Tables: {
      sync_users: {
        Row: {
          id: string
          user_hash: string
          verification_token: string
          created_at: string
          last_sync_at: string | null
        }
        Insert: {
          user_hash: string
          verification_token: string
        }
      }
      encrypted_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          encrypted_data: {
            ciphertext: string
            iv: string
            salt: string
            version: number
          }
          updated_at: number
          deleted: boolean
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          entry_date: string
          encrypted_data: object
          updated_at: number
          deleted?: boolean
        }
      }
      encrypted_reviews: {
        Row: {
          id: string
          user_id: string
          review_type: string
          period_start: string
          encrypted_data: object
          updated_at: number
          deleted: boolean
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          review_type: string
          period_start: string
          encrypted_data: object
          updated_at: number
          deleted?: boolean
        }
      }
    }
    Functions: {
      register_or_auth_user: {
        Args: {
          p_user_hash: string
          p_verification_token: string
          p_device_id: string
          p_device_name?: string
        }
        Returns: {
          success: boolean
          user_id?: string
          is_new?: boolean
          error?: string
        }
      }
      sync_entries: {
        Args: {
          p_user_hash: string
          p_entries: object[]
          p_last_sync_at: number
        }
        Returns: {
          success: boolean
          pushed: number
          pulled: number
          entries: object[]
          serverTime: number
          error?: string
        }
      }
      sync_reviews: {
        Args: {
          p_user_hash: string
          p_reviews: object[]
          p_last_sync_at: number
        }
        Returns: {
          success: boolean
          pushed: number
          pulled: number
          reviews: object[]
          serverTime: number
          error?: string
        }
      }
      sync_single_entry: {
        Args: {
          p_user_hash: string
          p_entry: object
        }
        Returns: {
          success: boolean
          synced: boolean
          error?: string
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }
  
  return supabaseClient
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}
