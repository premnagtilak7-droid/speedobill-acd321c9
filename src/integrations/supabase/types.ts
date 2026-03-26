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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          action: string
          created_at: string
          full_name: string
          hotel_id: string
          id: string
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          full_name?: string
          hotel_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          full_name?: string
          hotel_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          hotel_id: string
          id: string
          order_id: string | null
          performed_by: string
          performer_name: string | null
          table_number: number | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          hotel_id: string
          id?: string
          order_id?: string | null
          performed_by: string
          performer_name?: string | null
          table_number?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          hotel_id?: string
          id?: string
          order_id?: string | null
          performed_by?: string
          performer_name?: string | null
          table_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      counter_orders: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          items: Json
          token_number: number
          total_amount: number
          waiter_id: string
          waiter_name: string | null
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          items?: Json
          token_number: number
          total_amount?: number
          waiter_id: string
          waiter_name?: string | null
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          items?: Json
          token_number?: number
          total_amount?: number
          waiter_id?: string
          waiter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counter_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_categories: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_categories_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_feedback: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string | null
          hotel_id: string
          id: string
          order_id: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          hotel_id: string
          id?: string
          order_id?: string | null
          rating?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          hotel_id?: string
          id?: string
          order_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          hotel_id: string
          id: string
          items: Json
          modifiers: Json | null
          payment_method: string | null
          payment_status: string | null
          status: string
          table_id: string
          table_number: number
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          hotel_id: string
          id?: string
          items?: Json
          modifiers?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string
          table_id: string
          table_number: number
          total_amount?: number
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          hotel_id?: string
          id?: string
          items?: Json
          modifiers?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string
          table_id?: string
          table_number?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          created_at: string
          dietary_preferences: string | null
          email: string | null
          hotel_id: string
          id: string
          last_visit_at: string | null
          loyalty_points: number
          loyalty_tier: string | null
          name: string
          notes: string | null
          phone: string
          tags: string[] | null
          total_spend: number | null
          total_visits: number | null
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          dietary_preferences?: string | null
          email?: string | null
          hotel_id: string
          id?: string
          last_visit_at?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          name: string
          notes?: string | null
          phone: string
          tags?: string[] | null
          total_spend?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          dietary_preferences?: string | null
          email?: string | null
          hotel_id?: string
          id?: string
          last_visit_at?: string | null
          loyalty_points?: number
          loyalty_tier?: string | null
          name?: string
          notes?: string | null
          phone?: string
          tags?: string[] | null
          total_spend?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          expense_date: string
          hotel_id: string
          id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by: string
          description: string
          expense_date?: string
          hotel_id: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_date?: string
          hotel_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_expenses_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_sections: {
        Row: {
          color: string
          created_at: string
          hotel_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          hotel_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          hotel_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "floor_sections_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      held_orders: {
        Row: {
          created_at: string
          discount_percent: number
          held_by: string
          held_by_name: string
          hotel_id: string
          id: string
          items: Json
          resumed_at: string | null
          split_label: string | null
          status: string
          table_id: string
          table_number: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          held_by: string
          held_by_name?: string
          hotel_id: string
          id?: string
          items?: Json
          resumed_at?: string | null
          split_label?: string | null
          status?: string
          table_id: string
          table_number: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          held_by?: string
          held_by_name?: string
          hotel_id?: string
          id?: string
          items?: Json
          resumed_at?: string | null
          split_label?: string | null
          status?: string
          table_id?: string
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "held_orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "held_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          auto_cleanup_after_bill: boolean
          counter_billing_enabled: boolean
          created_at: string
          easy_void_enabled: boolean
          gst_enabled: boolean
          hotel_code: string
          id: string
          name: string
          owner_id: string
          phone: string | null
          subscription_expiry: string | null
          subscription_start_date: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          tax_percent: number
          token_counter: number
          updated_at: string
          upi_qr_url: string | null
          waitlist_notify_on_available: boolean
        }
        Insert: {
          address?: string | null
          auto_cleanup_after_bill?: boolean
          counter_billing_enabled?: boolean
          created_at?: string
          easy_void_enabled?: boolean
          gst_enabled?: boolean
          hotel_code?: string
          id?: string
          name?: string
          owner_id: string
          phone?: string | null
          subscription_expiry?: string | null
          subscription_start_date?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tax_percent?: number
          token_counter?: number
          updated_at?: string
          upi_qr_url?: string | null
          waitlist_notify_on_available?: boolean
        }
        Update: {
          address?: string | null
          auto_cleanup_after_bill?: boolean
          counter_billing_enabled?: boolean
          created_at?: string
          easy_void_enabled?: boolean
          gst_enabled?: boolean
          hotel_code?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          subscription_expiry?: string | null
          subscription_start_date?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tax_percent?: number
          token_counter?: number
          updated_at?: string
          upi_qr_url?: string | null
          waitlist_notify_on_available?: boolean
        }
        Relationships: []
      }
      ingredient_vendors: {
        Row: {
          id: string
          ingredient_id: string
          vendor_id: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          vendor_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_vendors_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string
          current_stock: number
          hotel_id: string
          id: string
          min_threshold: number
          name: string
          unit: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          hotel_id: string
          id?: string
          min_threshold?: number
          name: string
          unit?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          hotel_id?: string
          id?: string
          min_threshold?: number
          name?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      kot_items: {
        Row: {
          id: string
          kot_id: string
          name: string
          price: number
          quantity: number
          special_instructions: string | null
        }
        Insert: {
          id?: string
          kot_id: string
          name: string
          price: number
          quantity?: number
          special_instructions?: string | null
        }
        Update: {
          id?: string
          kot_id?: string
          name?: string
          price?: number
          quantity?: number
          special_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kot_items_kot_id_fkey"
            columns: ["kot_id"]
            isOneToOne: false
            referencedRelation: "kot_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      kot_tickets: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          hotel_id: string
          id: string
          order_id: string
          ready_at: string | null
          status: string
          table_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          hotel_id: string
          id?: string
          order_id: string
          ready_at?: string | null
          status?: string
          table_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          hotel_id?: string
          id?: string
          order_id?: string
          ready_at?: string | null
          status?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kot_tickets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kot_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kot_tickets_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string
          created_by: string | null
          duration_days: number
          id: string
          is_used: boolean
          key_code: string
          tier: string
          used_at: string | null
          used_by_hotel_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          is_used?: boolean
          key_code: string
          tier: string
          used_at?: string | null
          used_by_hotel_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          is_used?: boolean
          key_code?: string
          tier?: string
          used_at?: string | null
          used_by_hotel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_used_by_hotel_id_fkey"
            columns: ["used_by_hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_modifiers: {
        Row: {
          created_at: string
          group_name: string
          hotel_id: string
          id: string
          is_default: boolean
          menu_item_id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          group_name?: string
          hotel_id: string
          id?: string
          is_default?: boolean
          menu_item_id: string
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          group_name?: string
          hotel_id?: string
          id?: string
          is_default?: boolean
          menu_item_id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifiers_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_modifiers_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          created_at: string
          current_stock: number
          hotel_id: string
          id: string
          image_url: string | null
          is_available: boolean
          min_stock: number
          name: string
          price: number
          price_variants: Json | null
        }
        Insert: {
          category?: string
          created_at?: string
          current_stock?: number
          hotel_id: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          min_stock?: number
          name: string
          price: number
          price_variants?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          current_stock?: number
          hotel_id?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          min_stock?: number
          name?: string
          price?: number
          price_variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          is_custom: boolean
          name: string
          order_id: string
          price: number
          quantity: number
          special_instructions: string | null
        }
        Insert: {
          id?: string
          is_custom?: boolean
          name: string
          order_id: string
          price: number
          quantity?: number
          special_instructions?: string | null
        }
        Update: {
          id?: string
          is_custom?: boolean
          name?: string
          order_id?: string
          price?: number
          quantity?: number
          special_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billed_at: string | null
          created_at: string
          customer_address: string | null
          customer_id: string | null
          delivery_status: string | null
          discount_percent: number
          driver_name: string | null
          hotel_id: string
          id: string
          order_source: string
          payment_method: string
          split_label: string | null
          status: string
          table_id: string
          total: number
          waiter_id: string
        }
        Insert: {
          billed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          delivery_status?: string | null
          discount_percent?: number
          driver_name?: string | null
          hotel_id: string
          id?: string
          order_source?: string
          payment_method?: string
          split_label?: string | null
          status?: string
          table_id: string
          total?: number
          waiter_id: string
        }
        Update: {
          billed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_id?: string | null
          delivery_status?: string | null
          discount_percent?: number
          driver_name?: string | null
          hotel_id?: string
          id?: string
          order_source?: string
          payment_method?: string
          split_label?: string | null
          status?: string
          table_id?: string
          total?: number
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          config_key: string
          config_value: string
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: string
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string | null
          hotel_id: string | null
          id: string
          is_active: boolean
          join_date: string | null
          phone: string | null
          photo_url: string | null
          reminder_sent_day5: boolean | null
          reminder_sent_day7: boolean | null
          role: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          join_date?: string | null
          phone?: string | null
          photo_url?: string | null
          reminder_sent_day5?: boolean | null
          reminder_sent_day7?: boolean | null
          role?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          join_date?: string | null
          phone?: string | null
          photo_url?: string | null
          reminder_sent_day5?: boolean | null
          reminder_sent_day7?: boolean | null
          role?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_logs: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          ingredient_id: string
          purchased_at: string
          purchased_by: string
          purchased_by_name: string
          quantity: number
          total_cost: number
          unit_price: number
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          ingredient_id: string
          purchased_at?: string
          purchased_by: string
          purchased_by_name?: string
          quantity?: number
          total_cost?: number
          unit_price?: number
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          ingredient_id?: string
          purchased_at?: string
          purchased_by?: string
          purchased_by_name?: string
          quantity?: number
          total_cost?: number
          unit_price?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_logs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          ingredient_id: string
          menu_item_id: string
          quantity_required: number
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          ingredient_id: string
          menu_item_id: string
          quantity_required?: number
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          ingredient_id?: string
          menu_item_id?: string
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          guest_count: number
          hotel_id: string
          id: string
          notes: string | null
          reservation_time: string
          status: string
          table_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_name: string
          customer_phone?: string
          guest_count?: number
          hotel_id: string
          id?: string
          notes?: string | null
          reservation_time: string
          status?: string
          table_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_name?: string
          customer_phone?: string
          guest_count?: number
          hotel_id?: string
          id?: string
          notes?: string | null
          reservation_time?: string
          status?: string
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          hotel_id: string
          id: string
          merged_with_id: string | null
          position_x: number
          position_y: number
          section_name: string
          status: string
          table_number: number
          upi_qr_id: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          hotel_id: string
          id?: string
          merged_with_id?: string | null
          position_x?: number
          position_y?: number
          section_name?: string
          status?: string
          table_number: number
          upi_qr_id?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          hotel_id?: string
          id?: string
          merged_with_id?: string | null
          position_x?: number
          position_y?: number
          section_name?: string
          status?: string
          table_number?: number
          upi_qr_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_merged_with_id_fkey"
            columns: ["merged_with_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_upi_qr_id_fkey"
            columns: ["upi_qr_id"]
            isOneToOne: false
            referencedRelation: "upi_qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          created_at: string
          hotel_id: string
          id: string
          order_id: string | null
          sale_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          hotel_id: string
          id?: string
          order_id?: string | null
          sale_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          hotel_id?: string
          id?: string
          order_id?: string | null
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_calls: {
        Row: {
          call_type: string
          created_at: string
          hotel_id: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          table_id: string
          table_number: number
        }
        Insert: {
          call_type?: string
          created_at?: string
          hotel_id: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          table_id: string
          table_number: number
        }
        Update: {
          call_type?: string
          created_at?: string
          hotel_id?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          table_id?: string
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_calls_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_calls_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leaves: {
        Row: {
          approved_by: string | null
          created_at: string
          hotel_id: string
          id: string
          leave_date: string
          leave_type: string
          reason: string | null
          staff_user_id: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          hotel_id: string
          id?: string
          leave_date: string
          leave_type?: string
          reason?: string | null
          staff_user_id: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          hotel_id?: string
          id?: string
          leave_date?: string
          leave_type?: string
          reason?: string | null
          staff_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leaves_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salaries: {
        Row: {
          advance_paid: number
          base_salary: number
          bonus: number
          created_at: string
          deductions: number
          hotel_id: string
          id: string
          month: string
          notes: string | null
          paid_on: string | null
          staff_user_id: string
          status: string
        }
        Insert: {
          advance_paid?: number
          base_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          hotel_id: string
          id?: string
          month?: string
          notes?: string | null
          paid_on?: string | null
          staff_user_id: string
          status?: string
        }
        Update: {
          advance_paid?: number
          base_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          hotel_id?: string
          id?: string
          month?: string
          notes?: string | null
          paid_on?: string | null
          staff_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_salaries_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          end_time: string
          hotel_id: string
          id: string
          notes: string | null
          shift_date: string
          shift_type: string
          staff_user_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time?: string
          hotel_id: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_type?: string
          staff_user_id: string
          start_time?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          hotel_id?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_type?: string
          staff_user_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          expires_at: string | null
          hotel_id: string | null
          id: string
          plan_name: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          starts_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          billing_cycle: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expires_at?: string | null
          hotel_id?: string | null
          id?: string
          plan_name: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expires_at?: string | null
          hotel_id?: string | null
          id?: string
          plan_name?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          starts_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_qr_codes: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          image_url: string
          label: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          image_url: string
          label?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          image_url?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_qr_codes_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
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
      vendors: {
        Row: {
          category: string
          contact: string
          created_at: string
          hotel_id: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          category?: string
          contact?: string
          created_at?: string
          hotel_id: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          category?: string
          contact?: string
          created_at?: string
          hotel_id?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      void_reports: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          item_name: string
          item_price: number
          order_id: string
          quantity: number
          reason: string
          voided_by: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          item_name: string
          item_price: number
          order_id: string
          quantity?: number
          reason: string
          voided_by: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          item_name?: string
          item_price?: number
          order_id?: string
          quantity?: number
          reason?: string
          voided_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "void_reports_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "void_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          hotel_id: string
          id: string
          notified_at: string | null
          party_size: number
          seated_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_name: string
          customer_phone?: string
          hotel_id: string
          id?: string
          notified_at?: string | null
          party_size?: number
          seated_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_name?: string
          customer_phone?: string
          hotel_id?: string
          id?: string
          notified_at?: string | null
          party_size?: number
          seated_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      wastage_logs: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          ingredient_id: string
          logged_by: string
          logged_by_name: string
          quantity: number
          reason: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          ingredient_id: string
          logged_by: string
          logged_by_name?: string
          quantity?: number
          reason?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          ingredient_id?: string
          logged_by?: string
          logged_by_name?: string
          quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "wastage_logs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_logs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_stock_for_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
      get_user_hotel_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_waiter_to_hotel: {
        Args: { _hotel_code: string; _user_id: string }
        Returns: string
      }
      next_token_number: { Args: { _hotel_id: string }; Returns: number }
    }
    Enums: {
      app_role: "owner" | "waiter" | "chef" | "manager"
      subscription_tier: "free" | "basic" | "premium"
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
      app_role: ["owner", "waiter", "chef", "manager"],
      subscription_tier: ["free", "basic", "premium"],
    },
  },
} as const
