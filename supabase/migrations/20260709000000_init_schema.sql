-- ==========================================
-- SERVIO - MIGRATION 20260709000000_INIT_SCHEMA
-- Database Schema for Supabase / PostgreSQL
-- ==========================================

-- 1. Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Função Auxiliar para Atualização de timestamps (updated_at)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Tabela de Restaurantes (Entidade Central de Multi-tenant)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger de updated_at para restaurants
CREATE TRIGGER set_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Tabela de Perfis de Usuários (Estende auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'cashier', 'waiter', 'employee')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger de updated_at para profiles
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL, -- Nome do ícone Lucide
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger de updated_at para categories
CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Tabela de Produtos (Estrutura de estoque inclusa)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN DEFAULT true NOT NULL,
    
    -- Campos preparados para controle de estoque
    cost_price NUMERIC(10, 2) CHECK (cost_price >= 0),
    sku TEXT,
    stock_quantity NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    track_stock BOOLEAN DEFAULT false NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger de updated_at para products
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. Tabela de Garçons (waiters)
CREATE TABLE IF NOT EXISTS public.waiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- Código de identificação ou PIN para garçom operar no sistema
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    commission_rate NUMERIC(5, 2) DEFAULT 10.00 NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Opcional
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Garante que o código do garçom é único por restaurante
    UNIQUE (restaurant_id, code)
);

-- Trigger de updated_at para waiters
CREATE TRIGGER set_waiters_updated_at
BEFORE UPDATE ON public.waiters
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 8. Tabela de Comandas (Ativas e Fechadas/Histórico)
CREATE TABLE IF NOT EXISTS public.comandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number INTEGER NOT NULL CHECK (number > 0),
    table_number TEXT,
    waiter_id UUID REFERENCES public.waiters(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada')),
    discount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (discount >= 0),
    notes TEXT,
    opened_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    closed_at TIMESTAMPTZ,
    payment_method TEXT CHECK (payment_method IN ('dinheiro', 'cartao', 'pix', 'outro')),
    subtotal NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (subtotal >= 0),
    total NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger de updated_at para comandas
CREATE TRIGGER set_comandas_updated_at
BEFORE UPDATE ON public.comandas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Índice único parcial para garantir que apenas exista uma comanda ABERTA com um dado número por restaurante
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_comanda_idx 
ON public.comandas (restaurant_id, number) 
WHERE (status = 'aberta');

-- 9. Tabela de Itens da Comanda
CREATE TABLE IF NOT EXISTS public.comanda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comanda_id UUID NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    name TEXT NOT NULL, -- Cópia do nome do produto no momento do pedido
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0), -- Cópia do preço unitário do produto no momento do pedido
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 10. Tabela de Movimentações de Estoque (Estrutura Preparada)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL, -- Positivo para entrada/ajuste, Negativo para saída/venda
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'loss')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Função Helper Segura para buscar o restaurant_id do usuário atual autenticado
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS UUID AS $$
    SELECT restaurant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função Helper Segura para verificar se o usuário atual é admin (evita recursão infinita no RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- POLÍTICAS PARA RESTAURANTS
CREATE POLICY "Users can view their own restaurant" ON public.restaurants
    FOR SELECT USING (id = public.get_user_restaurant_id());

CREATE POLICY "Admins can update their own restaurant" ON public.restaurants
    FOR UPDATE USING (id = public.get_user_restaurant_id());

-- POLÍTICAS PARA PROFILES
CREATE POLICY "Users can view profiles in the same restaurant" ON public.profiles
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their restaurant" ON public.profiles
    FOR ALL USING (
        restaurant_id = public.get_user_restaurant_id() AND 
        public.is_admin()
    );

-- POLÍTICAS PARA CATEGORIES
CREATE POLICY "Users can access categories in their restaurant" ON public.categories
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id());

-- POLÍTICAS PARA PRODUCTS
CREATE POLICY "Users can access products in their restaurant" ON public.products
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id());

-- POLÍTICAS PARA WAITERS
CREATE POLICY "Users can access waiters in their restaurant" ON public.waiters
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id());

-- POLÍTICAS PARA COMANDAS
CREATE POLICY "Users can access comandas in their restaurant" ON public.comandas
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id());

-- POLÍTICAS PARA COMANDA_ITEMS
CREATE POLICY "Users can access items of comandas in their restaurant" ON public.comanda_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.comandas c
            WHERE c.id = comanda_items.comanda_id 
              AND c.restaurant_id = public.get_user_restaurant_id()
        )
    );

-- POLÍTICAS PARA STOCK_MOVEMENTS
CREATE POLICY "Users can access stock movements in their restaurant" ON public.stock_movements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = stock_movements.product_id
              AND p.restaurant_id = public.get_user_restaurant_id()
        )
    );

-- ==========================================
-- AUTOMATIC SIGNUP TRIGGERS
-- ==========================================

-- TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE RESTAURANTE E PERFIL APÓS CADASTRO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_restaurant_id UUID;
    v_restaurant_name TEXT;
    v_owner_name TEXT;
BEGIN
    -- Extrair os metadados passados no signUp
    v_restaurant_name := COALESCE(new.raw_user_meta_data->>'restaurant_name', 'Meu Restaurante');
    v_owner_name := COALESCE(new.raw_user_meta_data->>'name', 'Proprietário');

    -- 1. Criar o restaurante
    INSERT INTO public.restaurants (name, owner_name)
    VALUES (v_restaurant_name, v_owner_name)
    RETURNING id INTO v_restaurant_id;

    -- 2. Criar o perfil de administrador para o novo usuário
    INSERT INTO public.profiles (id, restaurant_id, name, role)
    VALUES (new.id, v_restaurant_id, v_owner_name, 'admin');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger executado no auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

