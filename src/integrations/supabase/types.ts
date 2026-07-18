export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          subject: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          subject: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          subject?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      name_recommendations: {
        Row: {
          based_on_users: string[] | null
          created_at: string
          id: string
          recommendation_score: number
          recommendation_type: string
          recommended_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          based_on_users?: string[] | null
          created_at?: string
          id?: string
          recommendation_score?: number
          recommendation_type?: string
          recommended_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          based_on_users?: string[] | null
          created_at?: string
          id?: string
          recommendation_score?: number
          recommendation_type?: string
          recommended_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      name_similarities: {
        Row: {
          co_occurrence_count: number
          created_at: string
          id: string
          name1: string
          name2: string
          similarity_score: number
          updated_at: string
        }
        Insert: {
          co_occurrence_count?: number
          created_at?: string
          id?: string
          name1: string
          name2: string
          similarity_score?: number
          updated_at?: string
        }
        Update: {
          co_occurrence_count?: number
          created_at?: string
          id?: string
          name1?: string
          name2?: string
          similarity_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      names: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string | null
          female_occurrences: number | null
          gender: string
          id: string
          is_active: boolean | null
          language: string | null
          male_occurrences: number | null
          meaning: string | null
          name: string
          origin: string | null
          popularity_score: number | null
          region: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          female_occurrences?: number | null
          gender: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          male_occurrences?: number | null
          meaning?: string | null
          name: string
          origin?: string | null
          popularity_score?: number | null
          region?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string | null
          female_occurrences?: number | null
          gender?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          male_occurrences?: number | null
          meaning?: string | null
          name?: string
          origin?: string | null
          popularity_score?: number | null
          region?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          admin_user_id: string | null
          created_at: string
          id: string
          invite_code: string
          status: string
          user1_id: string
          user2_id: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          status?: string
          user1_id: string
          user2_id?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          status?: string
          user1_id?: string
          user2_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          partner_name: string | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          partner_name?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          partner_name?: string | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_similarities: {
        Row: {
          common_likes_count: number
          created_at: string
          id: string
          similarity_score: number
          total_user1_likes: number
          total_user2_likes: number
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          common_likes_count?: number
          created_at?: string
          id?: string
          similarity_score?: number
          total_user1_likes?: number
          total_user2_likes?: number
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          common_likes_count?: number
          created_at?: string
          id?: string
          similarity_score?: number
          total_user1_likes?: number
          total_user2_likes?: number
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      user_swipes: {
        Row: {
          action: string
          created_at: string
          id: string
          name: string
          partnership_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          name: string
          partnership_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          name?: string
          partnership_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_swipes_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_name_similarities: { Args: never; Returns: undefined }
      calculate_user_similarities: { Args: never; Returns: undefined }
      current_user_email_matches: {
        Args: { check_email: string }
        Returns: boolean
      }
      get_partnership_by_invite_code: {
        Args: { invite_code_param: string }
        Returns: {
          id: string
          invite_code: string
          inviter_email: string
          inviter_name: string
          status: string
          user1_id: string
        }[]
      }
      is_active_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_admin: { Args: { user_id?: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      join_partnership_by_invite: {
        Args: { invite_code_param: string }
        Returns: Json
      }
      leave_partnership: { Args: never; Returns: undefined }
      migrate_existing_names: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
