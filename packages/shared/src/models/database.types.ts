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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      batches: {
        Row: {
          batch_number: string
          created_at: string
          expired_at: string
          id: number
          quantity: number
          variant_id: number
        }
        Insert: {
          batch_number: string
          created_at?: string
          expired_at: string
          id?: number
          quantity?: number
          variant_id: number
        }
        Update: {
          batch_number?: string
          created_at?: string
          expired_at?: string
          id?: number
          quantity?: number
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string
          company: string | null
          country: string
          created_at: string | null
          email: string
          first_name: string
          id: number
          last_name: string
          line1: string
          line2: string | null
          phone_number: string
          state: string | null
        }
        Insert: {
          city: string
          company?: string | null
          country: string
          created_at?: string | null
          email: string
          first_name: string
          id?: number
          last_name: string
          line1: string
          line2?: string | null
          phone_number: string
          state?: string | null
        }
        Update: {
          city?: string
          company?: string | null
          country?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: number
          last_name?: string
          line1?: string
          line2?: string | null
          phone_number?: string
          state?: string | null
        }
        Relationships: []
      }
      inventory_levels: {
        Row: {
          id: number
          location_id: number | null
          quantity: number
          updated_at: string | null
          variant_id: number | null
        }
        Insert: {
          id?: number
          location_id?: number | null
          quantity?: number
          updated_at?: string | null
          variant_id?: number | null
        }
        Update: {
          id?: number
          location_id?: number | null
          quantity?: number
          updated_at?: string | null
          variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          adjusted_at: string
          batch_id: number | null
          id: number
          location_id: number
          quantity_adjusted: number
          reference_id: string
          reference_type: string
          variant_id: number
        }
        Insert: {
          adjusted_at?: string
          batch_id?: number | null
          id?: number
          location_id: number
          quantity_adjusted: number
          reference_id: string
          reference_type: string
          variant_id: number
        }
        Update: {
          adjusted_at?: string
          batch_id?: number | null
          id?: number
          location_id?: number
          quantity_adjusted?: number
          reference_id?: string
          reference_type?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string
          country: string
          created_at: string | null
          id: number
          line1: string
          line2: string | null
          name: string
          state: string | null
        }
        Insert: {
          city: string
          country: string
          created_at?: string | null
          id?: number
          line1: string
          line2?: string | null
          name: string
          state?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string | null
          id?: number
          line1?: string
          line2?: string | null
          name?: string
          state?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          batch_tracked: boolean
          configs: Json
          created_at: string | null
          id: number
          is_archived: boolean
          name: string
          uom: string
        }
        Insert: {
          batch_tracked?: boolean
          configs?: Json
          created_at?: string | null
          id?: number
          is_archived?: boolean
          name: string
          uom: string
        }
        Update: {
          batch_tracked?: boolean
          configs?: Json
          created_at?: string | null
          id?: number
          is_archived?: boolean
          name?: string
          uom?: string
        }
        Relationships: []
      }
      sales_order_items: {
        Row: {
          batch_id: number | null
          created_at: string
          id: number
          price_per_unit: number
          quantity: number
          sales_order_id: number
          variant_id: number
        }
        Insert: {
          batch_id?: number | null
          created_at?: string
          id?: number
          price_per_unit?: number
          quantity: number
          sales_order_id: number
          variant_id: number
        }
        Update: {
          batch_id?: number | null
          created_at?: string
          id?: number
          price_per_unit?: number
          quantity?: number
          sales_order_id?: number
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          customer_id: number
          id: number
          location_id: number
          sales_order_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: number
          id?: number
          location_id: number
          sales_order_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: number
          id?: number
          location_id?: number
          sales_order_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          configs: Json
          created_at: string | null
          id: number
          is_archived: boolean
          product_id: number
          sales_price: number
          sku: string | null
        }
        Insert: {
          configs?: Json
          created_at?: string | null
          id?: number
          is_archived?: boolean
          product_id: number
          sales_price?: number
          sku?: string | null
        }
        Update: {
          configs?: Json
          created_at?: string | null
          id?: number
          is_archived?: boolean
          product_id?: number
          sales_price?: number
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_variant_and_clear_stock: {
        Args: { reason_note?: string; target_variant_id: number }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
