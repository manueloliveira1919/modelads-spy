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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      meta_offers: {
        Row: {
          active_ads_count: number
          active_days: number
          ad_archive_id: string
          ad_snapshot_url: string | null
          ad_start_date: string | null
          category: string
          country: string
          created_at: string
          creative_type: string
          creative_url: string | null
          description: string | null
          first_seen: string
          headline: string | null
          id: string
          is_active: boolean
          language: string
          last_seen: string
          link_url: string | null
          page_id: string
          page_name: string
          page_url: string | null
          product_type: string | null
          search_term: string | null
          status: string
          structure: string | null
          updated_at: string
        }
        Insert: {
          active_ads_count?: number
          active_days?: number
          ad_archive_id: string
          ad_snapshot_url?: string | null
          ad_start_date?: string | null
          category: string
          country?: string
          created_at?: string
          creative_type?: string
          creative_url?: string | null
          description?: string | null
          first_seen?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_seen?: string
          link_url?: string | null
          page_id: string
          page_name: string
          page_url?: string | null
          product_type?: string | null
          search_term?: string | null
          status?: string
          structure?: string | null
          updated_at?: string
        }
        Update: {
          active_ads_count?: number
          active_days?: number
          ad_archive_id?: string
          ad_snapshot_url?: string | null
          ad_start_date?: string | null
          category?: string
          country?: string
          created_at?: string
          creative_type?: string
          creative_url?: string | null
          description?: string | null
          first_seen?: string
          headline?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_seen?: string
          link_url?: string | null
          page_id?: string
          page_name?: string
          page_url?: string | null
          product_type?: string | null
          search_term?: string | null
          status?: string
          structure?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_refresh_runs: {
        Row: {
          details: Json | null
          error: string | null
          finished_at: string | null
          id: string
          offers_upserted: number
          pages_seen: number
          started_at: string
          status: string
        }
        Insert: {
          details?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          offers_upserted?: number
          pages_seen?: number
          started_at?: string
          status?: string
        }
        Update: {
          details?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          offers_upserted?: number
          pages_seen?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      list_active_offer_pages: {
        Args: never
        Returns: {
          active_ads_count: number
          active_days: number
          ad_archive_id: string
          ad_snapshot_url: string | null
          ad_start_date: string | null
          category: string
          country: string
          created_at: string
          creative_type: string
          creative_url: string | null
          description: string | null
          first_seen: string
          headline: string | null
          id: string
          is_active: boolean
          language: string
          last_seen: string
          link_url: string | null
          page_id: string
          page_name: string
          page_url: string | null
          product_type: string | null
          search_term: string | null
          status: string
          structure: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_offers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "starter" | "pro" | "admin"
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
      app_role: ["starter", "pro", "admin"],
    },
  },
} as const
