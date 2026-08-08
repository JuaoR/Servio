-- ==========================================
-- SERVIO - MIGRATION 20260810000000_AUDIT_FIXES
-- Auditoria Completa de Segurança e Persistência
-- ==========================================
-- Esta migration corrige:
-- 1. Políticas RLS genéricas ("FOR ALL") desmembradas em CRUD granular
-- 2. Policies faltantes de INSERT com WITH CHECK
-- 3. Tabela de histórico persistente (comanda_history)
-- 4. Correções de segurança nas funções helper
-- 5. Adição de operador_id nas inserções de caixa via RPC seguro
-- ==========================================

-- ==========================================
-- SEÇÃO 1: REMOVER POLICIES PROBLEMÁTICAS
-- (FOR ALL sem WITH CHECK = INSERT/UPDATE sem validação adequada)
-- ==========================================

-- Categories: remover FOR ALL genérico, criar CRUD granular
DROP POLICY IF EXISTS "Users can access categories in their restaurant" ON public.categories;

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE USING (restaurant_id = public.get_user_restaurant_id());

-- Products: remover FOR ALL genérico
DROP POLICY IF EXISTS "Users can access products in their restaurant" ON public.products;

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (restaurant_id = public.get_user_restaurant_id());

-- Waiters: remover FOR ALL genérico
DROP POLICY IF EXISTS "Users can access waiters in their restaurant" ON public.waiters;

CREATE POLICY "waiters_select" ON public.waiters
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "waiters_insert" ON public.waiters
  FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "waiters_update" ON public.waiters
  FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "waiters_delete" ON public.waiters
  FOR DELETE USING (restaurant_id = public.get_user_restaurant_id());

-- Comandas: remover FOR ALL genérico
DROP POLICY IF EXISTS "Users can access comandas in their restaurant" ON public.comandas;

CREATE POLICY "comandas_select" ON public.comandas
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "comandas_insert" ON public.comandas
  FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "comandas_update" ON public.comandas
  FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "comandas_delete" ON public.comandas
  FOR DELETE USING (restaurant_id = public.get_user_restaurant_id());

-- Comanda Items: remover FOR ALL genérico
DROP POLICY IF EXISTS "Users can access items of comandas in their restaurant" ON public.comanda_items;

CREATE POLICY "comanda_items_select" ON public.comanda_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_items.comanda_id
        AND c.restaurant_id = public.get_user_restaurant_id()
    )
  );

CREATE POLICY "comanda_items_insert" ON public.comanda_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_items.comanda_id
        AND c.restaurant_id = public.get_user_restaurant_id()
    )
  );

CREATE POLICY "comanda_items_update" ON public.comanda_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_items.comanda_id
        AND c.restaurant_id = public.get_user_restaurant_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_items.comanda_id
        AND c.restaurant_id = public.get_user_restaurant_id()
    )
  );

CREATE POLICY "comanda_items_delete" ON public.comanda_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_items.comanda_id
        AND c.restaurant_id = public.get_user_restaurant_id()
    )
  );

-- Stock movements
DROP POLICY IF EXISTS "Users can access stock movements in their restaurant" ON public.stock_movements;

CREATE POLICY "stock_movements_select" ON public.stock_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = stock_movements.product_id
        AND p.restaurant_id = public.get_user_restaurant_id()
    )
  );

CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = stock_movements.product_id
        AND p.restaurant_id = public.get_user_restaurant_id()
    )
  );

-- ==========================================
-- SEÇÃO 2: CORRIGIR POLICIES DO CAIXA
-- O bug de "Erro ao abrir o caixa" vem da policy "FOR ALL" sem WITH CHECK
-- ==========================================

-- Caixa Sessões: remover policies conflitantes
DROP POLICY IF EXISTS "Users can view caixa sessoes in their restaurant" ON public.caixa_sessoes;
DROP POLICY IF EXISTS "Admins can manage caixa sessoes" ON public.caixa_sessoes;

-- Qualquer usuário autenticado do restaurante pode ver as sessões
CREATE POLICY "caixa_sessoes_select" ON public.caixa_sessoes
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

-- Admins podem inserir/atualizar/deletar sessões de caixa
CREATE POLICY "caixa_sessoes_insert" ON public.caixa_sessoes
  FOR INSERT WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "caixa_sessoes_update" ON public.caixa_sessoes
  FOR UPDATE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  ) WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "caixa_sessoes_delete" ON public.caixa_sessoes
  FOR DELETE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

-- Caixa Movimentações
DROP POLICY IF EXISTS "Users can view caixa movimentacoes in their restaurant" ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS "Users can insert caixa movimentacoes in their restaurant" ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS "Admins can manage caixa movimentacoes" ON public.caixa_movimentacoes;

CREATE POLICY "caixa_mov_select" ON public.caixa_movimentacoes
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

-- Qualquer usuário autenticado do restaurante pode inserir movimentações
-- (vendas feitas por garçons/caixas devem ser registradas)
CREATE POLICY "caixa_mov_insert" ON public.caixa_movimentacoes
  FOR INSERT WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM public.caixa_sessoes cs
      WHERE cs.id = caixa_movimentacoes.caixa_id
        AND cs.restaurant_id = public.get_user_restaurant_id()
        AND cs.status = 'aberto'
    )
  );

-- Apenas admins podem atualizar ou deletar movimentações
CREATE POLICY "caixa_mov_update" ON public.caixa_movimentacoes
  FOR UPDATE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  ) WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "caixa_mov_delete" ON public.caixa_movimentacoes
  FOR DELETE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

-- Caixa Fechamentos
DROP POLICY IF EXISTS "Users can view caixa fechamentos in their restaurant" ON public.caixa_fechamentos;
DROP POLICY IF EXISTS "Admins can manage caixa fechamentos" ON public.caixa_fechamentos;

CREATE POLICY "caixa_fech_select" ON public.caixa_fechamentos
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "caixa_fech_insert" ON public.caixa_fechamentos
  FOR INSERT WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "caixa_fech_update" ON public.caixa_fechamentos
  FOR UPDATE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  ) WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "caixa_fech_delete" ON public.caixa_fechamentos
  FOR DELETE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

-- ==========================================
-- SEÇÃO 3: TABELA DE HISTÓRICO PERSISTENTE
-- Antes, o histórico era guardado apenas no localStorage.
-- Agora será persistido no banco de dados.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.comanda_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    comanda_number INTEGER NOT NULL,  -- Número da comanda (1-100)
    comanda_uuid UUID,                -- UUID original da comanda (pode ser NULL se não disponível)
    table_number TEXT,
    waiter_name TEXT,
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Snapshot dos itens no momento do fechamento
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method TEXT,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    caixa_id UUID REFERENCES public.caixa_sessoes(id) ON DELETE SET NULL,
    operador TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS comanda_history_restaurant_idx ON public.comanda_history (restaurant_id);
CREATE INDEX IF NOT EXISTS comanda_history_closed_at_idx ON public.comanda_history (restaurant_id, closed_at DESC);

-- RLS na tabela de histórico
ALTER TABLE public.comanda_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_select" ON public.comanda_history
  FOR SELECT USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "history_insert" ON public.comanda_history
  FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- Histórico é imutável — sem UPDATE ou DELETE por usuários normais
-- Apenas superuser pode corrigir histórico via SQL direto

-- ==========================================
-- SEÇÃO 4: ADICIONAR OPERADOR_ID AUTOMÁTICO
-- Garante que toda operação de caixa está vinculada ao usuário autenticado
-- ==========================================

-- Função RPC para abrir caixa de forma atômica e segura
-- Valida: usuário é admin do restaurante, não há caixa aberto
CREATE OR REPLACE FUNCTION public.abrir_caixa(
  p_saldo_inicial NUMERIC,
  p_operador TEXT,
  p_obs TEXT DEFAULT ''
)
RETURNS public.caixa_sessoes AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_caixa_existente UUID;
  v_nova_sessao public.caixa_sessoes;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = 'AUTH001';
  END IF;

  SELECT restaurant_id INTO v_restaurant_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado' USING ERRCODE = 'PROF001';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem abrir o caixa' USING ERRCODE = 'PERM001';
  END IF;

  -- Verificar se já existe um caixa aberto
  SELECT id INTO v_caixa_existente
  FROM public.caixa_sessoes
  WHERE restaurant_id = v_restaurant_id AND status = 'aberto'
  LIMIT 1;

  IF v_caixa_existente IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um caixa aberto para este restaurante' USING ERRCODE = 'CAIXA01';
  END IF;

  -- Criar nova sessão
  INSERT INTO public.caixa_sessoes (
    restaurant_id,
    status,
    saldo_inicial,
    operador,
    operador_id,
    obs,
    aberto_em
  ) VALUES (
    v_restaurant_id,
    'aberto',
    p_saldo_inicial,
    p_operador,
    v_user_id,
    p_obs,
    now()
  )
  RETURNING * INTO v_nova_sessao;

  -- Registrar movimentação de abertura
  INSERT INTO public.caixa_movimentacoes (
    caixa_id,
    restaurant_id,
    tipo,
    valor,
    descricao,
    operador,
    operador_id
  ) VALUES (
    v_nova_sessao.id,
    v_restaurant_id,
    'abertura',
    p_saldo_inicial,
    'Abertura de caixa com saldo inicial R$ ' || to_char(p_saldo_inicial, 'FM999999990.00'),
    p_operador,
    v_user_id
  );

  RETURN v_nova_sessao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC para fechar caixa de forma atômica e segura
CREATE OR REPLACE FUNCTION public.fechar_caixa(
  p_caixa_id UUID,
  p_saldo_contado NUMERIC,
  p_justificativa TEXT DEFAULT '',
  p_saldo_inicial NUMERIC DEFAULT 0,
  p_total_vendas_dinheiro NUMERIC DEFAULT 0,
  p_total_vendas_pix NUMERIC DEFAULT 0,
  p_total_vendas_credito NUMERIC DEFAULT 0,
  p_total_vendas_debito NUMERIC DEFAULT 0,
  p_total_vendas NUMERIC DEFAULT 0,
  p_total_sangrias NUMERIC DEFAULT 0,
  p_total_suprimentos NUMERIC DEFAULT 0,
  p_total_descontos NUMERIC DEFAULT 0,
  p_saldo_esperado NUMERIC DEFAULT 0,
  p_duracao_minutos INTEGER DEFAULT 0,
  p_operador TEXT DEFAULT '',
  p_qtd_vendas INTEGER DEFAULT 0
)
RETURNS public.caixa_fechamentos AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_sessao public.caixa_sessoes;
  v_fechamento public.caixa_fechamentos;
  v_diferenca NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = 'AUTH001';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem fechar o caixa' USING ERRCODE = 'PERM001';
  END IF;

  SELECT * INTO v_sessao
  FROM public.caixa_sessoes
  WHERE id = p_caixa_id AND status = 'aberto';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão de caixa não encontrada ou já fechada' USING ERRCODE = 'CAIXA02';
  END IF;

  v_restaurant_id := v_sessao.restaurant_id;

  IF v_restaurant_id != public.get_user_restaurant_id() THEN
    RAISE EXCEPTION 'Acesso negado: esta sessão pertence a outro restaurante' USING ERRCODE = 'PERM002';
  END IF;

  v_diferenca := p_saldo_contado - p_saldo_esperado;

  -- Atualizar sessão para fechada
  UPDATE public.caixa_sessoes
  SET status = 'fechado', fechado_em = now(), updated_at = now()
  WHERE id = p_caixa_id;

  -- Criar registro de fechamento
  INSERT INTO public.caixa_fechamentos (
    caixa_id,
    restaurant_id,
    saldo_inicial,
    total_vendas_dinheiro,
    total_vendas_pix,
    total_vendas_credito,
    total_vendas_debito,
    total_vendas,
    total_sangrias,
    total_suprimentos,
    total_descontos,
    saldo_esperado,
    saldo_contado,
    diferenca,
    justificativa,
    fechado_em,
    duracao_minutos,
    operador,
    operador_id,
    qtd_vendas
  ) VALUES (
    p_caixa_id,
    v_restaurant_id,
    p_saldo_inicial,
    p_total_vendas_dinheiro,
    p_total_vendas_pix,
    p_total_vendas_credito,
    p_total_vendas_debito,
    p_total_vendas,
    p_total_sangrias,
    p_total_suprimentos,
    p_total_descontos,
    p_saldo_esperado,
    p_saldo_contado,
    v_diferenca,
    p_justificativa,
    now(),
    p_duracao_minutos,
    p_operador,
    v_user_id,
    p_qtd_vendas
  )
  RETURNING * INTO v_fechamento;

  -- Registrar movimentação de fechamento
  INSERT INTO public.caixa_movimentacoes (
    caixa_id,
    restaurant_id,
    tipo,
    valor,
    descricao,
    operador,
    operador_id
  ) VALUES (
    p_caixa_id,
    v_restaurant_id,
    'fechamento',
    p_saldo_contado,
    'Fechamento do caixa. Saldo contado R$ ' || to_char(p_saldo_contado, 'FM999999990.00') || ' (Diferença: R$ ' || to_char(v_diferenca, 'FM999999990.00') || ')',
    p_operador,
    v_user_id
  );

  RETURN v_fechamento;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC para registrar sangria/suprimento
CREATE OR REPLACE FUNCTION public.registrar_movimentacao_caixa(
  p_caixa_id UUID,
  p_tipo TEXT,
  p_valor NUMERIC,
  p_descricao TEXT,
  p_operador TEXT,
  p_forma_pagamento TEXT DEFAULT NULL,
  p_comanda_id UUID DEFAULT NULL
)
RETURNS public.caixa_movimentacoes AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_id UUID;
  v_sessao_status TEXT;
  v_nova_mov public.caixa_movimentacoes;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = 'AUTH001';
  END IF;

  SELECT cs.restaurant_id, cs.status INTO v_restaurant_id, v_sessao_status
  FROM public.caixa_sessoes cs
  WHERE cs.id = p_caixa_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão de caixa não encontrada' USING ERRCODE = 'CAIXA03';
  END IF;

  IF v_sessao_status != 'aberto' THEN
    RAISE EXCEPTION 'O caixa não está aberto' USING ERRCODE = 'CAIXA04';
  END IF;

  IF v_restaurant_id != public.get_user_restaurant_id() THEN
    RAISE EXCEPTION 'Acesso negado: esta sessão pertence a outro restaurante' USING ERRCODE = 'PERM002';
  END IF;

  INSERT INTO public.caixa_movimentacoes (
    caixa_id,
    restaurant_id,
    tipo,
    valor,
    forma_pagamento,
    descricao,
    operador,
    operador_id,
    comanda_id
  ) VALUES (
    p_caixa_id,
    v_restaurant_id,
    p_tipo,
    p_valor,
    p_forma_pagamento,
    p_descricao,
    p_operador,
    v_user_id,
    p_comanda_id
  )
  RETURNING * INTO v_nova_mov;

  RETURN v_nova_mov;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC para fechar comanda e persistir histórico atomicamente
CREATE OR REPLACE FUNCTION public.fechar_comanda(
  p_comanda_uuid UUID,
  p_payment_method TEXT,
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_total NUMERIC,
  p_caixa_id UUID DEFAULT NULL,
  p_operador TEXT DEFAULT ''
)
RETURNS public.comanda_history AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_id UUID;
  v_comanda public.comandas;
  v_history public.comanda_history;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = 'AUTH001';
  END IF;

  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE id = p_comanda_uuid AND status = 'aberta';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada ou já fechada' USING ERRCODE = 'CMD001';
  END IF;

  v_restaurant_id := v_comanda.restaurant_id;

  IF v_restaurant_id != public.get_user_restaurant_id() THEN
    RAISE EXCEPTION 'Acesso negado: esta comanda pertence a outro restaurante' USING ERRCODE = 'PERM002';
  END IF;

  -- Fechar a comanda no banco
  UPDATE public.comandas
  SET
    status = 'fechada',
    payment_method = p_payment_method,
    subtotal = p_subtotal,
    discount = p_discount,
    total = p_total,
    closed_at = now(),
    updated_at = now()
  WHERE id = p_comanda_uuid;

  -- Inserir no histórico persistente
  INSERT INTO public.comanda_history (
    restaurant_id,
    comanda_number,
    comanda_uuid,
    table_number,
    waiter_name,
    notes,
    items,
    subtotal,
    discount,
    total,
    payment_method,
    opened_at,
    closed_at,
    caixa_id,
    operador
  )
  SELECT
    v_restaurant_id,
    v_comanda.number,
    v_comanda.id,
    v_comanda.table_number,
    (SELECT w.name FROM public.waiters w WHERE w.id = v_comanda.waiter_id),
    v_comanda.notes,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ci.id,
          'product_id', ci.product_id,
          'name', ci.name,
          'price', ci.price,
          'quantity', ci.quantity,
          'notes', ci.notes
        )
      ) FROM public.comanda_items ci WHERE ci.comanda_id = v_comanda.id),
      '[]'::jsonb
    ),
    p_subtotal,
    p_discount,
    p_total,
    p_payment_method,
    v_comanda.opened_at,
    now(),
    p_caixa_id,
    p_operador
  RETURNING * INTO v_history;

  -- Registrar movimentação no caixa (se houver caixa aberto)
  IF p_caixa_id IS NOT NULL THEN
    PERFORM public.registrar_movimentacao_caixa(
      p_caixa_id,
      'venda',
      p_total,
      'Venda Comanda #' || v_comanda.number || ' (' || upper(p_payment_method) || ')',
      p_operador,
      p_payment_method,
      v_comanda.id
    );
  END IF;

  RETURN v_history;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SEÇÃO 5: BUSCAR HISTÓRICO DO BANCO
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_historico_restaurante(p_limit INTEGER DEFAULT 200)
RETURNS SETOF public.comanda_history AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.comanda_history
  WHERE restaurant_id = public.get_user_restaurant_id()
  ORDER BY closed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Índice para produtos por restaurante + disponibilidade
CREATE INDEX IF NOT EXISTS products_restaurant_available_idx
  ON public.products (restaurant_id, is_available);

-- Índice para waiters ativos por restaurante
CREATE INDEX IF NOT EXISTS waiters_restaurant_active_idx
  ON public.waiters (restaurant_id, is_active);
