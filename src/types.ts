export interface Categoria {
  id: string;
  name: string;
  color: string;
  icon: string; // Name of Lucide icon, e.g., 'Utensils', 'CupSoda'
}

export interface Produto {
  id: string;
  name: string;
  cid: string; // Category ID
  price: number;
  avail: boolean;
}

export interface ItemPedido {
  id: string;
  pid: string;
  name: string;
  price: number;
  qty: number;
  note: string;
}

export interface Comanda {
  id: number;
  status: 'livre' | 'aberta';
  items: ItemPedido[];
  mesa: string;
  garcom: string;
  obs: string;
  openedAt: number | null;
  discount: number;
}

export interface HistoricoItem {
  id: string;
  cmdId: number;
  mesa: string;
  garcom: string;
  obs: string;
  items: ItemPedido[];
  subtotal: number;
  discount: number;
  total: number;
  payMethod: string;
  openedAt: number;
  closedAt: number;
}

export interface SystemState {
  categories: Categoria[];
  products: Produto[];
  comandas: Record<number, Comanda>;
  history: HistoricoItem[];
  rname: string;
  garcons?: Garcom[];
}

export interface Garcom {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  active: boolean;
  commissionRate: number; // percentage, e.g. 10 for 10%
}
