export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          address: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          categories: string[] | null
          specialties: string[] | null
          website: string | null
          working_hours: any
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          categories?: string[] | null
          specialties?: string[] | null
          website?: string | null
          working_hours?: any
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          categories?: string[] | null
          specialties?: string[] | null
          website?: string | null
          working_hours?: any
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      business_users: {
        Row: {
          id: string
          business_id: string
          user_id: string
          role: string
          permissions: any
          first_name: string | null
          last_name: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          user_id: string
          role?: string
          permissions?: any
          first_name?: string | null
          last_name?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          user_id?: string
          role?: string
          permissions?: any
          first_name?: string | null
          last_name?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          business_id: string
          phone: string
          name: string | null
          email: string | null
          instagram_username: string | null
          birthday: string | null
          points: number
          total_spent: number
          visit_count: number
          first_interaction: string
          last_interaction: string
          status: string
          notes: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          phone: string
          name?: string | null
          email?: string | null
          instagram_username?: string | null
          birthday?: string | null
          points?: number
          total_spent?: number
          visit_count?: number
          first_interaction?: string
          last_interaction?: string
          status?: string
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          phone?: string
          name?: string | null
          email?: string | null
          instagram_username?: string | null
          birthday?: string | null
          points?: number
          total_spent?: number
          visit_count?: number
          first_interaction?: string
          last_interaction?: string
          status?: string
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      loyalty_settings: {
        Row: {
          id: string
          business_id: string
          purchase_ranges: any
          welcome_points: number
          birthday_bonus_points: number
          referral_points: number
          special_dates: any
          points_expiry_days: number
          expiry_notification_days: number
          vip_levels: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          purchase_ranges?: any
          welcome_points?: number
          birthday_bonus_points?: number
          referral_points?: number
          special_dates?: any
          points_expiry_days?: number
          expiry_notification_days?: number
          vip_levels?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          purchase_ranges?: any
          welcome_points?: number
          birthday_bonus_points?: number
          referral_points?: number
          special_dates?: any
          points_expiry_days?: number
          expiry_notification_days?: number
          vip_levels?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Business = Database['public']['Tables']['businesses']['Row']
export type BusinessUser = Database['public']['Tables']['business_users']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type LoyaltySettings = Database['public']['Tables']['loyalty_settings']['Row']

export interface UserPermissions {
  dashboard: boolean
  point_loading: boolean
  bot_configuration?: boolean
  client_management?: boolean
  reservations_dashboard?: boolean
  loyalty_program?: boolean
  reports_analytics?: boolean
  employee_management?: boolean
}