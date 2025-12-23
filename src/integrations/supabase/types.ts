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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_banners: {
        Row: {
          click_count: number | null
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          click_count?: number | null
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          check_in_date: string | null
          check_out_date: string | null
          contact_phone: string | null
          created_at: string
          id: string
          message: string | null
          owner_id: string
          price_per_night: number | null
          property_id: string
          requested_date: string
          requested_time: string
          requester_id: string
          reservation_type: string | null
          response_message: string | null
          share_phone: boolean | null
          status: string
          total_nights: number | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          check_in_date?: string | null
          check_out_date?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          owner_id: string
          price_per_night?: number | null
          property_id: string
          requested_date: string
          requested_time: string
          requester_id: string
          reservation_type?: string | null
          response_message?: string | null
          share_phone?: boolean | null
          status?: string
          total_nights?: number | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          check_in_date?: string | null
          check_out_date?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          price_per_night?: number | null
          property_id?: string
          requested_date?: string
          requested_time?: string
          requester_id?: string
          reservation_type?: string | null
          response_message?: string | null
          share_phone?: boolean | null
          status?: string
          total_nights?: number | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      archived_conversations: {
        Row: {
          created_at: string
          id: string
          other_user_id: string
          property_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          other_user_id: string
          property_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          other_user_id?: string
          property_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      banner_clicks: {
        Row: {
          banner_id: string
          clicked_at: string
          id: string
          ip_hash: string | null
          user_id: string | null
        }
        Insert: {
          banner_id: string
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Update: {
          banner_id?: string
          clicked_at?: string
          id?: string
          ip_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banner_clicks_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "ad_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blocked_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blocked_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_content: {
        Row: {
          content: string
          id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          listing_type: string | null
          property_id: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          listing_type?: string | null
          property_id?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          listing_type?: string | null
          property_id?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          entity_id: string | null
          id: string
          is_read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          phone: string | null
          push_token: string | null
          updated_at: string
          user_id: string
          verification_token: string | null
          verification_token_expires_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          push_token?: string | null
          updated_at?: string
          user_id: string
          verification_token?: string | null
          verification_token_expires_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          push_token?: string | null
          updated_at?: string
          user_id?: string
          verification_token?: string | null
          verification_token_expires_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          area: number
          bathrooms: number | null
          bedrooms: number | null
          city: string
          country: string | null
          created_at: string
          description: string | null
          discount_14_nights: number | null
          discount_3_nights: number | null
          discount_30_nights: number | null
          discount_5_nights: number | null
          discount_7_nights: number | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_sponsored: boolean | null
          lat: number | null
          listing_type: string
          lng: number | null
          minimum_stay: number | null
          postal_code: string | null
          price: number
          price_per_night: number | null
          property_type: string
          sponsored_by: string | null
          sponsored_until: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          address: string
          area: number
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          country?: string | null
          created_at?: string
          description?: string | null
          discount_14_nights?: number | null
          discount_3_nights?: number | null
          discount_30_nights?: number | null
          discount_5_nights?: number | null
          discount_7_nights?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_sponsored?: boolean | null
          lat?: number | null
          listing_type?: string
          lng?: number | null
          minimum_stay?: number | null
          postal_code?: string | null
          price: number
          price_per_night?: number | null
          property_type: string
          sponsored_by?: string | null
          sponsored_until?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          address?: string
          area?: number
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          country?: string | null
          created_at?: string
          description?: string | null
          discount_14_nights?: number | null
          discount_3_nights?: number | null
          discount_30_nights?: number | null
          discount_5_nights?: number | null
          discount_7_nights?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_sponsored?: boolean | null
          lat?: number | null
          listing_type?: string
          lng?: number | null
          minimum_stay?: number | null
          postal_code?: string | null
          price?: number
          price_per_night?: number | null
          property_type?: string
          sponsored_by?: string | null
          sponsored_until?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      property_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          property_id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          property_id: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          property_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_blocked_dates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_primary: boolean | null
          property_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          property_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          property_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          property_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          property_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          average_rating: number | null
          badge_level: string
          created_at: string
          id: string
          listings_count: number
          reviews_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_rating?: number | null
          badge_level?: string
          created_at?: string
          id?: string
          listings_count?: number
          reviews_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_rating?: number | null
          badge_level?: string
          created_at?: string
          id?: string
          listings_count?: number
          reviews_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          admin_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          is_permanent: boolean
          reason: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      appointments_secure: {
        Row: {
          check_in_date: string | null
          check_out_date: string | null
          contact_phone: string | null
          created_at: string | null
          id: string | null
          message: string | null
          owner_id: string | null
          price_per_night: number | null
          property_id: string | null
          requested_date: string | null
          requested_time: string | null
          requester_id: string | null
          reservation_type: string | null
          response_message: string | null
          share_phone: boolean | null
          status: string | null
          total_nights: number | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          check_in_date?: string | null
          check_out_date?: string | null
          contact_phone?: never
          created_at?: string | null
          id?: string | null
          message?: string | null
          owner_id?: string | null
          price_per_night?: number | null
          property_id?: string | null
          requested_date?: string | null
          requested_time?: string | null
          requester_id?: string | null
          reservation_type?: string | null
          response_message?: string | null
          share_phone?: boolean | null
          status?: string | null
          total_nights?: number | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          check_in_date?: string | null
          check_out_date?: string | null
          contact_phone?: never
          created_at?: string | null
          id?: string | null
          message?: string | null
          owner_id?: string | null
          price_per_night?: number | null
          property_id?: string | null
          requested_date?: string | null
          requested_time?: string | null
          requester_id?: string | null
          reservation_type?: string | null
          response_message?: string | null
          share_phone?: boolean | null
          status?: string | null
          total_nights?: number | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          last_seen_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          last_seen_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          last_seen_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_badge_level: {
        Args: {
          p_average_rating: number
          p_listings_count: number
          p_reviews_count: number
        }
        Returns: string
      }
      get_user_email_by_phone: {
        Args: { phone_number: string }
        Returns: string
      }
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
      report_reason:
        | "spam"
        | "inappropriate_content"
        | "fraud"
        | "false_info"
        | "other"
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
      report_reason: [
        "spam",
        "inappropriate_content",
        "fraud",
        "false_info",
        "other",
      ],
    },
  },
} as const
