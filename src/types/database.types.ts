export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          role: 'super_admin' | 'admin' | 'internal_agent' | 'partner_agent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          role?: 'super_admin' | 'admin' | 'internal_agent' | 'partner_agent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          role?: 'super_admin' | 'admin' | 'internal_agent' | 'partner_agent'
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables here...
    }
  }
}
