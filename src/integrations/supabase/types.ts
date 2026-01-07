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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          comment_keywords: string[] | null
          completed_count: number
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          points_per_task: number
          required_completions: number
          screenshot_example_url: string | null
          task_type: Database["public"]["Enums"]["task_type"]
          tiktok_post_url: string
          updated_at: string
          video_description: string | null
        }
        Insert: {
          comment_keywords?: string[] | null
          completed_count?: number
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          points_per_task?: number
          required_completions?: number
          screenshot_example_url?: string | null
          task_type: Database["public"]["Enums"]["task_type"]
          tiktok_post_url: string
          updated_at?: string
          video_description?: string | null
        }
        Update: {
          comment_keywords?: string[] | null
          completed_count?: number
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          points_per_task?: number
          required_completions?: number
          screenshot_example_url?: string | null
          task_type?: Database["public"]["Enums"]["task_type"]
          tiktok_post_url?: string
          updated_at?: string
          video_description?: string | null
        }
        Relationships: []
      }
      ai_config: {
        Row: {
          api_key_set: boolean
          created_at: string
          id: string
          is_default: boolean
          is_enabled: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          api_key_set?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          api_key_set?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          confidence_threshold: number
          created_at: string
          id: string
          is_active: boolean
          prompt_content: string
          prompt_name: string
          task_type: string
          updated_at: string
        }
        Insert: {
          confidence_threshold?: number
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_content: string
          prompt_name: string
          task_type: string
          updated_at?: string
        }
        Update: {
          confidence_threshold?: number
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_content?: string
          prompt_name?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      allowed_email_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_enabled: boolean
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_enabled?: boolean
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_enabled?: boolean
        }
        Relationships: []
      }
      follow_verifications: {
        Row: {
          ad_id: string
          advertiser_tiktok_username: string
          created_at: string
          delay_check_at: string | null
          delay_check_passed: boolean | null
          id: string
          initial_check_at: string | null
          initial_check_passed: boolean
          performer_tiktok_username: string
          scheduled_delay_check: string | null
          status: string
          submission_id: string
          user_id: string
        }
        Insert: {
          ad_id: string
          advertiser_tiktok_username: string
          created_at?: string
          delay_check_at?: string | null
          delay_check_passed?: boolean | null
          id?: string
          initial_check_at?: string | null
          initial_check_passed?: boolean
          performer_tiktok_username: string
          scheduled_delay_check?: string | null
          status?: string
          submission_id: string
          user_id: string
        }
        Update: {
          ad_id?: string
          advertiser_tiktok_username?: string
          created_at?: string
          delay_check_at?: string | null
          delay_check_passed?: boolean | null
          id?: string
          initial_check_at?: string | null
          initial_check_passed?: boolean
          performer_tiktok_username?: string
          scheduled_delay_check?: string | null
          status?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_verifications_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_comments: {
        Row: {
          ad_id: string
          comment_text: string
          created_at: string
          id: string
          is_used: boolean
          user_id: string
        }
        Insert: {
          ad_id: string
          comment_text: string
          created_at?: string
          id?: string
          is_used?: boolean
          user_id: string
        }
        Update: {
          ad_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          is_used?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_comments_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_content: {
        Row: {
          button_text: string | null
          button_url: string | null
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_visible: boolean
          metadata: Json | null
          section_key: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          button_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          metadata?: Json | null
          section_key: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          button_url?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_visible?: boolean
          metadata?: Json | null
          section_key?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          tik_points: number
          tiktok_name: string | null
          tiktok_username: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          tik_points?: number
          tiktok_name?: string | null
          tiktok_username: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          tik_points?: number
          tiktok_name?: string | null
          tiktok_username?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smtp_config: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_enabled: boolean
          password_set: boolean
          port: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string
          host: string
          id?: string
          is_enabled?: boolean
          password_set?: boolean
          port?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_enabled?: boolean
          password_set?: boolean
          port?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          ad_id: string
          admin_notes: string | null
          ai_analysis: Json | null
          created_at: string
          id: string
          points_awarded: number | null
          screenshot_urls: string[]
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_id: string
          admin_notes?: string | null
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          screenshot_urls?: string[]
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          admin_notes?: string | null
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          screenshot_urls?: string[]
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      task_status: "pending" | "approved" | "rejected" | "needs_review"
      task_type:
        | "like"
        | "comment"
        | "save"
        | "watch"
        | "follow"
        | "combo_mini"
        | "combo_large"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      task_status: ["pending", "approved", "rejected", "needs_review"],
      task_type: [
        "like",
        "comment",
        "save",
        "watch",
        "follow",
        "combo_mini",
        "combo_large",
      ],
    },
  },
} as const
