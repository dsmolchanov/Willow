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
      user_scenarios: {
        Row: {
          user_scenario_id: number
          clerk_id: string | null
          scenario_id: number | null
          start_time: string | null
          end_time: string | null
          status: 'Not Started' | 'In Progress' | 'Completed' | null
          score: number | null
          feedback: string | null
          skill_objectives: Json | null
          practice_metrics: Json | null
          duration_minutes: number | null
        }
        Insert: {
          user_scenario_id?: number
          clerk_id?: string | null
          scenario_id?: number | null
          start_time?: string | null
          end_time?: string | null
          status?: 'Not Started' | 'In Progress' | 'Completed' | null
          score?: number | null
          feedback?: string | null
          skill_objectives?: Json | null
          practice_metrics?: Json | null
          duration_minutes?: number | null
        }
        Update: {
          user_scenario_id?: number
          clerk_id?: string | null
          scenario_id?: number | null
          start_time?: string | null
          end_time?: string | null
          status?: 'Not Started' | 'In Progress' | 'Completed' | null
          score?: number | null
          feedback?: string | null
          skill_objectives?: Json | null
          practice_metrics?: Json | null
          duration_minutes?: number | null
        }
      }
      user_conversations: {
        Row: {
          conversation_id: number
          clerk_id: string | null
          elevenlabs_conversation_id: string | null
          start_time: string | null
          end_time: string | null
          scenario_info: Json | null
          analysis: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id?: number
          clerk_id?: string | null
          elevenlabs_conversation_id?: string | null
          start_time?: string | null
          end_time?: string | null
          scenario_info?: Json | null
          analysis?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: number
          clerk_id?: string | null
          elevenlabs_conversation_id?: string | null
          start_time?: string | null
          end_time?: string | null
          scenario_info?: Json | null
          analysis?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_skill_weights: {
        Row: {
          weight_id: number
          clerk_id: string
          weights: Json
          created_at: string
          updated_at: string | null
        }
        Insert: {
          weight_id?: number
          clerk_id: string
          weights: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          weight_id?: number
          clerk_id?: string
          weights?: Json
          created_at?: string
          updated_at?: string | null
        }
      }
      user_learning_paths: {
        Row: {
          path_id: number
          clerk_id: string
          path: Json
          created_at: string
          updated_at: string | null
        }
        Insert: {
          path_id?: number
          clerk_id: string
          path: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          path_id?: number
          clerk_id?: string
          path?: Json
          created_at?: string
          updated_at?: string | null
        }
      }
      skills: {
        Row: {
          skill_id: number
          name: string
          description: string | null
          category: string | null
          subcategory: string | null
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          skill_id?: number
          name: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          skill_id?: number
          name?: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          is_active?: boolean
          created_at?: string
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