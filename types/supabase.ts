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
      user_traits: {
        Row: {
          user_trait_id: number
          clerk_id: string | null
          life_context: Json | null
          stakes_level: Json | null
          growth_motivation: Json | null
          confidence_pattern: Json | null
          interaction_style: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_trait_id?: number
          clerk_id?: string | null
          life_context?: Json | null
          stakes_level?: Json | null
          growth_motivation?: Json | null
          confidence_pattern?: Json | null
          interaction_style?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_trait_id?: number
          clerk_id?: string | null
          life_context?: Json | null
          stakes_level?: Json | null
          growth_motivation?: Json | null
          confidence_pattern?: Json | null
          interaction_style?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 