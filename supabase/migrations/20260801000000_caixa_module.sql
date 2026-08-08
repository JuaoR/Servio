-- ==========================================
-- SERVIO - MIGRATION 20260801000000_CAIXA_MODULE
-- Módulo de Caixa / PDV
-- ==========================================

-- 1. Tabela de Sessões de Caixa
CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    saldo_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    fechado_em TIMESTAMPTZ,
    operador TEXT NOT NULL, -- nome do admin responsável
    operador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    obs TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_caixa_sessoes_updated_at
BEFORE UPDATE ON public.caixa_sessoes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Só pode haver UMA sessão aberta por restaurante
CREATE UNIQUE INDEX IF NOT EXISTS unique_caixa_aberto_idx
ON public.caixa_sessoes (restaurant_id)
WHERE (status = 'aberto');

-- 2. Tabela de Movimentações de Caixa
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_id UUID NOT NULL REFERENCES public.caixa_sessoes(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('abertura', 'venda', 'sangria', 'suprimento', 'cancelamento', 'desconto', 'fechamento')),
    valor NUMERIC(10, 2) NOT NULL, -- positivo = entrada, negativo = saída
    forma_pagamento TEXT, -- para vendas: dinheiro, pix, credito, debito
    descricao TEXT NOT NULL DEFAULT '',
    operador TEXT NOT NULL,
    operador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comanda_id UUID REFERENCES public.comandas(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Tabela de Fechamentos (snapshot permanente)
CREATE TABLE IF NOT EXISTS public.caixa_fechamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_id UUID NOT NULL REFERENCES public.caixa_sessoes(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    saldo_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_vendas_dinheiro NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_vendas_pix NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_vendas_credito NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_vendas_debito NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_vendas NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_sangrias NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_suprimentos NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_descontos NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    saldo_esperado NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    saldo_contado NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    diferenca NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    justificativa TEXT DEFAULT '',
    fechado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    duracao_minutos INTEGER NOT NULL DEFAULT 0,
    operador TEXT NOT NULL,
    operador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    qtd_vendas INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- RLS
-- ==========================================

ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_fechamentos ENABLE ROW LEVEL SECURITY;

-- Sessões
CREATE POLICY "Users can view caixa sessoes in their restaurant" ON public.caixa_sessoes
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Admins can manage caixa sessoes" ON public.caixa_sessoes
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id() AND public.is_admin());

-- Movimentações
CREATE POLICY "Users can view caixa movimentacoes in their restaurant" ON public.caixa_movimentacoes
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can insert caixa movimentacoes in their restaurant" ON public.caixa_movimentacoes
    FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Admins can manage caixa movimentacoes" ON public.caixa_movimentacoes
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id() AND public.is_admin());

-- Fechamentos
CREATE POLICY "Users can view caixa fechamentos in their restaurant" ON public.caixa_fechamentos
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Admins can manage caixa fechamentos" ON public.caixa_fechamentos
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id() AND public.is_admin());

-- ==========================================
-- HELPER FUNCTION
-- ==========================================

-- Retorna a sessão de caixa aberta do restaurante atual
CREATE OR REPLACE FUNCTION public.get_caixa_aberto()
RETURNS UUID AS $$
    SELECT id FROM public.caixa_sessoes
    WHERE restaurant_id = public.get_user_restaurant_id()
      AND status = 'aberto'
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
