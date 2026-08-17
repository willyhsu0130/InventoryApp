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
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: number
          line_1: string
          line_2: string | null
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: never
          line_1: string
          line_2?: string | null
          state: string
          updated_at?: string
          zip: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: never
          line_1?: string
          line_2?: string | null
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          batch_barcode: string | null
          batch_created_date: string | null
          batch_number: string
          created_at: string
          expiration_date: string | null
          id: number
          location_id: number | null
          quantity_in_stock: number
          updated_at: string
          variant_id: number
        }
        Insert: {
          batch_barcode?: string | null
          batch_created_date?: string | null
          batch_number: string
          created_at?: string
          expiration_date?: string | null
          id?: never
          location_id?: number | null
          quantity_in_stock?: number
          updated_at?: string
          variant_id: number
        }
        Update: {
          batch_barcode?: string | null
          batch_created_date?: string | null
          batch_number?: string
          created_at?: string
          expiration_date?: string | null
          id?: never
          location_id?: number | null
          quantity_in_stock?: number
          updated_at?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          customer_id: number
          default: boolean
          entity_type: string
          first_name: string | null
          id: number
          last_name: string | null
          line_1: string | null
          line_2: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          customer_id: number
          default?: boolean
          entity_type: string
          first_name?: string | null
          id?: never
          last_name?: string | null
          line_1?: string | null
          line_2?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          customer_id?: number
          default?: boolean
          entity_type?: string
          first_name?: string | null
          id?: never
          last_name?: string | null
          line_1?: string | null
          line_2?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          category: string | null
          comment: string | null
          company: string | null
          created_at: string
          currency: string | null
          default_billing_id: number | null
          default_shipping_id: number | null
          deleted_at: string | null
          discount_rate: number | null
          email: string | null
          first_name: string | null
          id: number
          last_name: string | null
          name: string
          phone: string | null
          reference_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          comment?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          default_billing_id?: number | null
          default_shipping_id?: number | null
          deleted_at?: string | null
          discount_rate?: number | null
          email?: string | null
          first_name?: string | null
          id?: never
          last_name?: string | null
          name: string
          phone?: string | null
          reference_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          comment?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          default_billing_id?: number | null
          default_shipping_id?: number | null
          deleted_at?: string | null
          discount_rate?: number | null
          email?: string | null
          first_name?: string | null
          id?: never
          last_name?: string | null
          name?: string
          phone?: string | null
          reference_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_levels: {
        Row: {
          average_cost: number
          id: number
          location_id: number
          quantity_committed: number
          quantity_expected: number
          quantity_in_stock: number
          quantity_missing_or_excess: number | null
          quantity_potential: number | null
          reorder_point: number
          updated_at: string
          value_in_stock: number
          variant_id: number
        }
        Insert: {
          average_cost?: number
          id?: never
          location_id: number
          quantity_committed?: number
          quantity_expected?: number
          quantity_in_stock?: number
          quantity_missing_or_excess?: number | null
          quantity_potential?: number | null
          reorder_point?: number
          updated_at?: string
          value_in_stock?: number
          variant_id: number
        }
        Update: {
          average_cost?: number
          id?: never
          location_id?: number
          quantity_committed?: number
          quantity_expected?: number
          quantity_in_stock?: number
          quantity_missing_or_excess?: number | null
          quantity_potential?: number | null
          reorder_point?: number
          updated_at?: string
          value_in_stock?: number
          variant_id?: number
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
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_id: number | null
          created_at: string
          deleted_at: string | null
          id: number
          is_primary: boolean
          legal_name: string | null
          manufacturing_allowed: boolean
          name: string
          purchase_allowed: boolean
          sales_allowed: boolean
          updated_at: string
        }
        Insert: {
          address_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          is_primary?: boolean
          legal_name?: string | null
          manufacturing_allowed?: boolean
          name: string
          purchase_allowed?: boolean
          sales_allowed?: boolean
          updated_at?: string
        }
        Update: {
          address_id?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          is_primary?: boolean
          legal_name?: string | null
          manufacturing_allowed?: boolean
          name?: string
          purchase_allowed?: boolean
          sales_allowed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_orders: {
        Row: {
          actual_quantity: number | null
          additional_info: string | null
          created_at: string
          deleted_at: string | null
          done_date: string | null
          id: number
          ingredient_availability:
            | Database["public"]["Enums"]["katana_ingredient_availability"]
            | null
          is_linked_to_sales_order: boolean
          location_id: number
          material_cost: number | null
          operations_cost: number | null
          order_created_date: string
          order_no: string
          planned_quantity: number
          production_deadline_date: string | null
          sales_order_delivery_deadline: string | null
          sales_order_id: number | null
          sales_order_row_id: number | null
          serial_numbers: Json | null
          status: Database["public"]["Enums"]["katana_mo_status"]
          subassemblies_cost: number | null
          total_actual_time: number | null
          total_cost: number | null
          total_planned_time: number | null
          traceability: Json | null
          updated_at: string
          variant_id: number
        }
        Insert: {
          actual_quantity?: number | null
          additional_info?: string | null
          created_at?: string
          deleted_at?: string | null
          done_date?: string | null
          id?: never
          ingredient_availability?:
            | Database["public"]["Enums"]["katana_ingredient_availability"]
            | null
          is_linked_to_sales_order?: boolean
          location_id: number
          material_cost?: number | null
          operations_cost?: number | null
          order_created_date?: string
          order_no: string
          planned_quantity: number
          production_deadline_date?: string | null
          sales_order_delivery_deadline?: string | null
          sales_order_id?: number | null
          sales_order_row_id?: number | null
          serial_numbers?: Json | null
          status?: Database["public"]["Enums"]["katana_mo_status"]
          subassemblies_cost?: number | null
          total_actual_time?: number | null
          total_cost?: number | null
          total_planned_time?: number | null
          traceability?: Json | null
          updated_at?: string
          variant_id: number
        }
        Update: {
          actual_quantity?: number | null
          additional_info?: string | null
          created_at?: string
          deleted_at?: string | null
          done_date?: string | null
          id?: never
          ingredient_availability?:
            | Database["public"]["Enums"]["katana_ingredient_availability"]
            | null
          is_linked_to_sales_order?: boolean
          location_id?: number
          material_cost?: number | null
          operations_cost?: number | null
          order_created_date?: string
          order_no?: string
          planned_quantity?: number
          production_deadline_date?: string | null
          sales_order_delivery_deadline?: string | null
          sales_order_id?: number | null
          sales_order_row_id?: number | null
          serial_numbers?: Json | null
          status?: Database["public"]["Enums"]["katana_mo_status"]
          subassemblies_cost?: number | null
          total_actual_time?: number | null
          total_cost?: number | null
          total_planned_time?: number | null
          traceability?: Json | null
          updated_at?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_sales_order_row_id_fkey"
            columns: ["sales_order_row_id"]
            isOneToOne: false
            referencedRelation: "sales_order_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_configs: {
        Row: {
          created_at: string
          id: number
          name: string
          product_id: number
          values: string[]
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          product_id: number
          values?: string[]
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          product_id?: number
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_configs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          abc_classification: string | null
          config_attributes: Json
          created_at: string
          custom_fields: Json
          id: number
          internal_barcode: string | null
          lead_time: number | null
          material_id: number | null
          minimum_order_quantity: number | null
          product_id: number
          purchase_price: number | null
          registered_barcode: string | null
          sales_price: number | null
          sku: string | null
          supplier_item_codes: string[] | null
          type: string
          updated_at: string
        }
        Insert: {
          abc_classification?: string | null
          config_attributes?: Json
          created_at?: string
          custom_fields?: Json
          id?: never
          internal_barcode?: string | null
          lead_time?: number | null
          material_id?: number | null
          minimum_order_quantity?: number | null
          product_id: number
          purchase_price?: number | null
          registered_barcode?: string | null
          sales_price?: number | null
          sku?: string | null
          supplier_item_codes?: string[] | null
          type?: string
          updated_at?: string
        }
        Update: {
          abc_classification?: string | null
          config_attributes?: Json
          created_at?: string
          custom_fields?: Json
          id?: never
          internal_barcode?: string | null
          lead_time?: number | null
          material_id?: number | null
          minimum_order_quantity?: number | null
          product_id?: number
          purchase_price?: number | null
          registered_barcode?: string | null
          sales_price?: number | null
          sku?: string | null
          supplier_item_codes?: string[] | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_info: string | null
          archived_at: string | null
          batch_tracked: boolean
          category_name: string | null
          created_at: string
          custom_field_collection_id: number | null
          default_supplier_id: number | null
          deleted_at: string | null
          id: number
          is_archived: boolean
          is_auto_assembly: boolean
          is_producible: boolean
          is_purchasable: boolean
          is_sellable: boolean
          name: string
          operations_in_sequence: boolean
          purchase_uom: string | null
          purchase_uom_conversion_rate: number | null
          serial_tracked: boolean
          type: string
          uom: string
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          archived_at?: string | null
          batch_tracked?: boolean
          category_name?: string | null
          created_at?: string
          custom_field_collection_id?: number | null
          default_supplier_id?: number | null
          deleted_at?: string | null
          id?: never
          is_archived?: boolean
          is_auto_assembly?: boolean
          is_producible?: boolean
          is_purchasable?: boolean
          is_sellable?: boolean
          name: string
          operations_in_sequence?: boolean
          purchase_uom?: string | null
          purchase_uom_conversion_rate?: number | null
          serial_tracked?: boolean
          type?: string
          uom?: string
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          archived_at?: string | null
          batch_tracked?: boolean
          category_name?: string | null
          created_at?: string
          custom_field_collection_id?: number | null
          default_supplier_id?: number | null
          deleted_at?: string | null
          id?: never
          is_archived?: boolean
          is_auto_assembly?: boolean
          is_producible?: boolean
          is_purchasable?: boolean
          is_sellable?: boolean
          name?: string
          operations_in_sequence?: boolean
          purchase_uom?: string | null
          purchase_uom_conversion_rate?: number | null
          serial_tracked?: boolean
          type?: string
          uom?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_rows: {
        Row: {
          created_at: string
          id: number
          price_per_unit: number
          purchase_order_id: number
          quantity: number
          received_quantity: number
          updated_at: string
          variant_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          price_per_unit: number
          purchase_order_id: number
          quantity: number
          received_quantity?: number
          updated_at?: string
          variant_id: number
        }
        Update: {
          created_at?: string
          id?: never
          price_per_unit?: number
          purchase_order_id?: number
          quantity?: number
          received_quantity?: number
          updated_at?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_rows_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_rows_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          currency: string
          expected_arrival_date: string | null
          id: number
          location_id: number
          order_no: string
          status: Database["public"]["Enums"]["katana_po_status"]
          supplier_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          expected_arrival_date?: string | null
          id?: never
          location_id: number
          order_no: string
          status?: Database["public"]["Enums"]["katana_po_status"]
          supplier_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          expected_arrival_date?: string | null
          id?: never
          location_id?: number
          order_no?: string
          status?: Database["public"]["Enums"]["katana_po_status"]
          supplier_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_addresses: {
        Row: {
          city: string
          company: string | null
          country: string
          created_at: string
          entity_type: string
          first_name: string | null
          id: number
          last_name: string | null
          line_1: string
          line_2: string | null
          phone: string | null
          sales_order_id: number
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          city: string
          company?: string | null
          country: string
          created_at?: string
          entity_type: string
          first_name?: string | null
          id?: never
          last_name?: string | null
          line_1: string
          line_2?: string | null
          phone?: string | null
          sales_order_id: number
          state: string
          updated_at?: string
          zip: string
        }
        Update: {
          city?: string
          company?: string | null
          country?: string
          created_at?: string
          entity_type?: string
          first_name?: string | null
          id?: never
          last_name?: string | null
          line_1?: string
          line_2?: string | null
          phone?: string | null
          sales_order_id?: number
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_addresses_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_rows: {
        Row: {
          attributes: Json | null
          cogs_value: number | null
          conversion_date: string | null
          conversion_rate: number | null
          created_at: string
          deleted_at: string | null
          id: number
          linked_manufacturing_order_id: number | null
          location_id: number | null
          price_per_unit: number
          price_per_unit_in_base_currency: number | null
          product_availability:
            | Database["public"]["Enums"]["katana_product_availability"]
            | null
          product_expected_date: string | null
          quantity: number
          sales_order_id: number
          tax_rate: number | null
          tax_rate_id: number | null
          total: number | null
          total_in_base_currency: number | null
          traceability: Json | null
          updated_at: string
          variant_id: number
        }
        Insert: {
          attributes?: Json | null
          cogs_value?: number | null
          conversion_date?: string | null
          conversion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          linked_manufacturing_order_id?: number | null
          location_id?: number | null
          price_per_unit: number
          price_per_unit_in_base_currency?: number | null
          product_availability?:
            | Database["public"]["Enums"]["katana_product_availability"]
            | null
          product_expected_date?: string | null
          quantity: number
          sales_order_id: number
          tax_rate?: number | null
          tax_rate_id?: number | null
          total?: number | null
          total_in_base_currency?: number | null
          traceability?: Json | null
          updated_at?: string
          variant_id: number
        }
        Update: {
          attributes?: Json | null
          cogs_value?: number | null
          conversion_date?: string | null
          conversion_rate?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          linked_manufacturing_order_id?: number | null
          location_id?: number | null
          price_per_unit?: number
          price_per_unit_in_base_currency?: number | null
          product_availability?:
            | Database["public"]["Enums"]["katana_product_availability"]
            | null
          product_expected_date?: string | null
          quantity?: number
          sales_order_id?: number
          tax_rate?: number | null
          tax_rate_id?: number | null
          total?: number | null
          total_in_base_currency?: number | null
          traceability?: Json | null
          updated_at?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_rows_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_rows_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_rows_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_shipping_fees: {
        Row: {
          amount: number
          description: string | null
          id: number
          sales_order_id: number
          tax_rate_id: number | null
        }
        Insert: {
          amount?: number
          description?: string | null
          id?: never
          sales_order_id: number
          tax_rate_id?: number | null
        }
        Update: {
          amount?: number
          description?: string | null
          id?: never
          sales_order_id?: number
          tax_rate_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_shipping_fees_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          additional_info: string | null
          billing_address_id: number | null
          conversion_date: string | null
          conversion_rate: number | null
          created_at: string
          currency: string
          custom_fields: Json | null
          customer_id: number
          customer_ref: string | null
          deleted_at: string | null
          delivery_date: string | null
          ecommerce_order_id: string | null
          ecommerce_order_type: string | null
          ecommerce_store_name: string | null
          id: number
          ingredient_availability:
            | Database["public"]["Enums"]["katana_ingredient_availability"]
            | null
          ingredient_expected_date: string | null
          invoicing_status: string | null
          location_id: number
          order_created_date: string
          order_no: string
          picked_date: string | null
          product_availability:
            | Database["public"]["Enums"]["katana_product_availability"]
            | null
          product_expected_date: string | null
          production_status:
            | Database["public"]["Enums"]["katana_production_status"]
            | null
          shipping_address_id: number | null
          source: string | null
          status: Database["public"]["Enums"]["katana_sales_order_status"]
          total: number
          total_in_base_currency: number
          tracking_number: string | null
          tracking_number_url: string | null
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          billing_address_id?: number | null
          conversion_date?: string | null
          conversion_rate?: number | null
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          customer_id: number
          customer_ref?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          ecommerce_order_id?: string | null
          ecommerce_order_type?: string | null
          ecommerce_store_name?: string | null
          id?: never
          ingredient_availability?:
            | Database["public"]["Enums"]["katana_ingredient_availability"]
            | null
          ingredient_expected_date?: string | null
          invoicing_status?: string | null
          location_id: number
          order_created_date?: string
          order_no: string
          picked_date?: string | null
          product_availability?:
            | Database["public"]["Enums"]["katana_product_availability"]
            | null
          product_expected_date?: string | null
          production_status?:
            | Database["public"]["Enums"]["katana_production_status"]
            | null
          shipping_address_id?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["katana_sales_order_status"]
          total?: number
          total_in_base_currency?: number
          tracking_number?: string | null
          tracking_number_url?: string | null
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          billing_address_id?: number | null
          conversion_date?: string | null
          conversion_rate?: number | null
          created_at?: string
          currency?: string
          custom_fields?: Json | null
          customer_id?: number
          customer_ref?: string | null
          deleted_at?: string | null
          delivery_date?: string | null
          ecommerce_order_id?: string | null
          ecommerce_order_type?: string | null
          ecommerce_store_name?: string | null
          id?: never
          ingredient_availability?:
            | Database["public"]["Enums"]["katana_ingredient_availability"]
            | null
          ingredient_expected_date?: string | null
          invoicing_status?: string | null
          location_id?: number
          order_created_date?: string
          order_no?: string
          picked_date?: string | null
          product_availability?:
            | Database["public"]["Enums"]["katana_product_availability"]
            | null
          product_expected_date?: string | null
          production_status?:
            | Database["public"]["Enums"]["katana_production_status"]
            | null
          shipping_address_id?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["katana_sales_order_status"]
          total?: number
          total_in_base_currency?: number
          tracking_number?: string | null
          tracking_number_url?: string | null
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
      stock_adjustment_rows: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          id: number
          quantity: number
          stock_adjustment_id: number
          variant_id: number
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          id?: never
          quantity: number
          stock_adjustment_id: number
          variant_id: number
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          id?: never
          quantity?: number
          stock_adjustment_id?: number
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_rows_stock_adjustment_id_fkey"
            columns: ["stock_adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_rows_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_traceability: {
        Row: {
          batch_id: number | null
          bin_location_id: number | null
          id: number
          quantity: number
          serial_number_id: number | null
          stock_adjustment_row_id: number
        }
        Insert: {
          batch_id?: number | null
          bin_location_id?: number | null
          id?: never
          quantity: number
          serial_number_id?: number | null
          stock_adjustment_row_id: number
        }
        Update: {
          batch_id?: number | null
          bin_location_id?: number | null
          id?: never
          quantity?: number
          serial_number_id?: number | null
          stock_adjustment_row_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_traceability_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_traceability_stock_adjustment_row_id_fkey"
            columns: ["stock_adjustment_row_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustment_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          additional_info: string | null
          created_at: string
          deleted_at: string | null
          id: number
          location_id: number
          reason: string | null
          stock_adjustment_date: string
          stock_adjustment_number: string
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          location_id: number
          reason?: string | null
          stock_adjustment_date?: string
          stock_adjustment_number: string
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: never
          location_id?: number
          reason?: string | null
          stock_adjustment_date?: string
          stock_adjustment_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          id: number
          passwordHash: string | null
          username: string
        }
        Insert: {
          id?: number
          passwordHash?: string | null
          username: string
        }
        Update: {
          id?: number
          passwordHash?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      katana_ingredient_availability:
        | "PROCESSED"
        | "IN_STOCK"
        | "NOT_AVAILABLE"
        | "EXPECTED"
        | "NO_RECIPE"
        | "NOT_APPLICABLE"
      katana_mo_status: "NOT_STARTED" | "BLOCKED" | "IN_PROGRESS" | "DONE"
      katana_po_status:
        | "NOT_RECEIVED"
        | "PARTIALLY_RECEIVED"
        | "RECEIVED"
        | "CANCELLED"
      katana_product_availability:
        | "IN_STOCK"
        | "EXPECTED"
        | "PICKED"
        | "NOT_AVAILABLE"
        | "NOT_APPLICABLE"
      katana_production_status:
        | "NOT_STARTED"
        | "NONE"
        | "NOT_APPLICABLE"
        | "IN_PROGRESS"
        | "BLOCKED"
        | "DONE"
      katana_sales_order_status:
        | "NOT_SHIPPED"
        | "PARTIALLY_PACKED"
        | "PARTIALLY_DELIVERED"
        | "PACKED"
        | "DELIVERED"
        | "PENDING"
        | "CANCELLED"
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
      katana_ingredient_availability: [
        "PROCESSED",
        "IN_STOCK",
        "NOT_AVAILABLE",
        "EXPECTED",
        "NO_RECIPE",
        "NOT_APPLICABLE",
      ],
      katana_mo_status: ["NOT_STARTED", "BLOCKED", "IN_PROGRESS", "DONE"],
      katana_po_status: [
        "NOT_RECEIVED",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "CANCELLED",
      ],
      katana_product_availability: [
        "IN_STOCK",
        "EXPECTED",
        "PICKED",
        "NOT_AVAILABLE",
        "NOT_APPLICABLE",
      ],
      katana_production_status: [
        "NOT_STARTED",
        "NONE",
        "NOT_APPLICABLE",
        "IN_PROGRESS",
        "BLOCKED",
        "DONE",
      ],
      katana_sales_order_status: [
        "NOT_SHIPPED",
        "PARTIALLY_PACKED",
        "PARTIALLY_DELIVERED",
        "PACKED",
        "DELIVERED",
        "PENDING",
        "CANCELLED",
      ],
    },
  },
} as const

export class SupabaseError extends Error {
  public details: string;
  public hint: string;
  public code: string;

  constructor(error: { message: string; details: string; hint: string; code: string }) {
    super(error.message);
    this.name = 'SupabaseError';
    this.details = error.details;
    this.hint = error.hint;
    this.code = error.code;
  }
}