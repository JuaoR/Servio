export interface Restaurant {
  id: string;
  name: string;
  owner_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  restaurant_id: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier' | 'waiter' | 'employee';
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Categoria {
  id: string;
  name: string;
  color: string;
  icon: string; // Name of Lucide icon, e.g., 'Utensils', 'CupSoda'
  restaurant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Produto {
  id: string;
  name: string;
  cid: string; // Category ID (front-end local)
  category_id?: string; // Mapped database Category ID
  price: number;
  avail: boolean; // Availability (front-end local)
  is_available?: boolean; // Mapped database availability
  
  // Stock fields
  cost_price?: number;
  sku?: string;
  stock_quantity?: number;
  track_stock?: boolean;
  
  restaurant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ItemPedido {
  id: string;
  pid: string; // Product ID (front-end local)
  product_id?: string; // Mapped database Product ID
  name: string;
  price: number;
  qty: number; // Quantity (front-end local)
  quantity?: number; // Mapped database quantity
  note: string; // Notes (front-end local)
  notes?: string; // Mapped database notes
  created_at?: string;
}

export interface Comanda {
  id: number; // Front-end local grid number identifier
  uuid?: string; // Database UUID
  restaurant_id?: string;
  number?: number; // Database comanda number
  status: 'livre' | 'aberta';
  items: ItemPedido[];
  mesa: string; // Table (front-end local)
  table_number?: string; // Mapped database table_number
  garcom: string; // Waiter name (front-end local)
  waiter_id?: string | null; // Mapped database Waiter UUID
  obs: string; // Observations (front-end local)
  notes?: string; // Mapped database notes
  openedAt: number | null; // Milliseconds timestamp (front-end local)
  opened_at?: string | null; // TIMESTAMPTZ ISO string
  closed_at?: string | null; // TIMESTAMPTZ ISO string
  discount: number;
  subtotal?: number;
  total?: number;
  payment_method?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HistoricoItem {
  id: string;
  cmdId: number; // Comanda grid number (front-end local)
  restaurant_id?: string;
  number?: number; // Database comanda number
  mesa: string; // Table (front-end local)
  table_number?: string; // Mapped database table_number
  garcom: string; // Waiter name (front-end local)
  waiter_id?: string | null; // Mapped database Waiter UUID
  obs: string; // Observations (front-end local)
  notes?: string; // Mapped database notes
  items: ItemPedido[];
  subtotal: number;
  discount: number;
  total: number;
  payMethod: string; // Payment method (front-end local)
  payment_method?: string; // Mapped database payment_method
  openedAt: number; // Milliseconds timestamp (front-end local)
  opened_at?: string; // TIMESTAMPTZ ISO string
  closedAt: number; // Milliseconds timestamp (front-end local)
  closed_at?: string; // TIMESTAMPTZ ISO string
  created_at?: string;
  updated_at?: string;
}

export interface Funcionario {
  id: string;
  name: string;
  username: string;
  password: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  active?: boolean; // Active (front-end local)
  is_active?: boolean; // Mapped database is_active
  commissionRate?: number; // percentage, e.g. 10 for 10% (front-end local)
  commission_rate?: number; // Mapped database commission rate
  restaurant_id?: string;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SystemState {
  categories: Categoria[];
  products: Produto[];
  comandas: Record<number, Comanda>;
  history: HistoricoItem[];
  rname: string;
  garcons?: Funcionario[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: 'in' | 'out' | 'adjustment' | 'sale' | 'loss';
  description?: string;
  created_at?: string;
  created_by?: string;
}

