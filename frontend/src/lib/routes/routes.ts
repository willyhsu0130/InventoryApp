// src/lib/routes/katanaRoutes.ts

export const KATANA_BASE_URL = 'https://api.katanamrp.com';

export const KATANA_API_ROUTES = {
  // Master Data
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id: number | string) => `/products/${id}`,
  VARIANTS: '/variants',
  VARIANT_BY_ID: (id: number | string) => `/variants/${id}`,
  MATERIALS: '/materials',
  MATERIAL_BY_ID: (id: number | string) => `/materials/${id}`,
  SERVICES: '/services',
  RECIPES: '/recipes',
  OPERATIONS: '/operations',

  // Inventory & Batches
  INVENTORY: '/inventory',
  BATCHES: '/batches',
  BATCH_STOCKS: '/batch_stocks',
  BATCH_BY_ID: (id: number | string) => `/batches_stocks/${id}`,
  STOCK_ADJUSTMENTS: '/stock_adjustments',
  STOCK_TRANSFERS: '/stock_transfers',

  // Purchasing
  SUPPLIERS: '/suppliers',
  PURCHASE_ORDERS: '/purchase_orders',
  PURCHASE_ORDER_BY_ID: (id: number | string) => `/purchase_orders/${id}`,

  // Sales
  CUSTOMERS: '/customers',
  CUSTOMER_BY_ID: (id: number | string) => `/customers/${id}`,
  SALES_ORDERS: '/sales_orders',
  SALES_ORDER_BY_ID: (id: number | string) => `/sales_orders/${id}`,

  // Manufacturing
  MANUFACTURING_ORDERS: '/manufacturing_orders',
  MANUFACTURING_ORDER_BY_ID: (id: number | string) => `/manufacturing_orders/${id}`,

  // System
  LOCATIONS: '/locations',
  WEBHOOKS: '/webhooks',
} as const;