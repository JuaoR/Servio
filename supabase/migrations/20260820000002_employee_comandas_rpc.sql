-- Comandas para funcionários autenticados por employee_sessions.
-- O funcionário não possui auth.uid(), portanto as operações passam por RPCs
-- SECURITY DEFINER que validam o token da sessão e o restaurant_id.

CREATE OR REPLACE FUNCTION public.employee_get_comandas(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_result JSONB;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.employee_sessions
  WHERE token = p_token
    AND expires_at > now();

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Sessão de funcionário inválida ou expirada';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.number,
      'uuid', c.id,
      'status', c.status,
      'mesa', COALESCE(c.table_number, ''),
      'garcom', COALESCE(c.waiter_id::text, ''),
      'obs', COALESCE(c.notes, ''),
      'openedAt', EXTRACT(EPOCH FROM c.opened_at) * 1000,
      'discount', COALESCE(c.discount, 0),
      'items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ci.id,
          'pid', ci.product_id,
          'name', ci.name,
          'price', ci.price,
          'qty', ci.quantity,
          'note', COALESCE(ci.notes, '')
        ) ORDER BY ci.created_at)
        FROM public.comanda_items ci
        WHERE ci.comanda_id = c.id
      ), '[]'::jsonb)
    ) ORDER BY c.number
  ), '[]'::jsonb)
  INTO v_result
  FROM public.comandas c
  WHERE c.restaurant_id = v_restaurant_id
    AND c.status = 'aberta';

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.employee_open_comanda(
  p_token UUID,
  p_number INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_comanda public.comandas;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.employee_sessions
  WHERE token = p_token AND expires_at > now();

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Sessão de funcionário inválida ou expirada';
  END IF;

  IF p_number < 1 OR p_number > 100 THEN
    RAISE EXCEPTION 'Número de comanda inválido';
  END IF;

  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE restaurant_id = v_restaurant_id
    AND number = p_number
    AND status = 'aberta'
  LIMIT 1;

  IF v_comanda.id IS NULL THEN
    INSERT INTO public.comandas (restaurant_id, number, status, opened_at)
    VALUES (v_restaurant_id, p_number, 'aberta', now())
    RETURNING * INTO v_comanda;
  END IF;

  RETURN jsonb_build_object(
    'id', v_comanda.number,
    'uuid', v_comanda.id,
    'status', v_comanda.status,
    'mesa', COALESCE(v_comanda.table_number, ''),
    'garcom', COALESCE(v_comanda.waiter_id::text, ''),
    'obs', COALESCE(v_comanda.notes, ''),
    'openedAt', EXTRACT(EPOCH FROM v_comanda.opened_at) * 1000,
    'discount', COALESCE(v_comanda.discount, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.employee_save_comanda(
  p_token UUID,
  p_number INTEGER,
  p_items JSONB,
  p_discount NUMERIC DEFAULT 0,
  p_mesa TEXT DEFAULT '',
  p_obs TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_comanda public.comandas;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_product_restaurant UUID;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.employee_sessions
  WHERE token = p_token AND expires_at > now();

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Sessão de funcionário inválida ou expirada';
  END IF;

  IF p_number < 1 OR p_number > 100 THEN
    RAISE EXCEPTION 'Número de comanda inválido';
  END IF;

  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE restaurant_id = v_restaurant_id
    AND number = p_number
    AND status = 'aberta'
  LIMIT 1;

  IF v_comanda.id IS NULL THEN
    INSERT INTO public.comandas (restaurant_id, number, status, opened_at)
    VALUES (v_restaurant_id, p_number, 'aberta', now())
    RETURNING * INTO v_comanda;
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Itens inválidos';
  END IF;

  DELETE FROM public.comanda_items WHERE comanda_id = v_comanda.id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT restaurant_id INTO v_product_restaurant
    FROM public.products
    WHERE id = (v_item->>'pid')::UUID;

    IF v_product_restaurant IS NULL OR v_product_restaurant <> v_restaurant_id THEN
      RAISE EXCEPTION 'Produto não pertence a este restaurante';
    END IF;

    INSERT INTO public.comanda_items (
      comanda_id, product_id, name, price, quantity, notes
    ) VALUES (
      v_comanda.id,
      (v_item->>'pid')::UUID,
      v_item->>'name',
      (v_item->>'price')::NUMERIC,
      GREATEST(1, (v_item->>'qty')::INTEGER),
      NULLIF(v_item->>'note', '')
    );

    v_subtotal := v_subtotal
      + ((v_item->>'price')::NUMERIC * GREATEST(1, (v_item->>'qty')::INTEGER));
  END LOOP;

  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));

  UPDATE public.comandas
  SET table_number = COALESCE(p_mesa, ''),
      notes = COALESCE(p_obs, ''),
      discount = COALESCE(p_discount, 0),
      subtotal = v_subtotal,
      total = v_total,
      updated_at = now()
  WHERE id = v_comanda.id;

  RETURN jsonb_build_object(
    'id', v_comanda.number,
    'uuid', v_comanda.id,
    'status', 'aberta',
    'mesa', COALESCE(p_mesa, ''),
    'garcom', COALESCE(v_comanda.waiter_id::text, ''),
    'obs', COALESCE(p_obs, ''),
    'openedAt', EXTRACT(EPOCH FROM v_comanda.opened_at) * 1000,
    'discount', COALESCE(p_discount, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.employee_close_comanda(
  p_token UUID,
  p_number INTEGER,
  p_method TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_comanda_id UUID;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.employee_sessions
  WHERE token = p_token AND expires_at > now();

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Sessão de funcionário inválida ou expirada';
  END IF;

  SELECT id INTO v_comanda_id
  FROM public.comandas
  WHERE restaurant_id = v_restaurant_id
    AND number = p_number
    AND status = 'aberta';

  IF v_comanda_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.comandas
  SET status = 'fechada', payment_method = p_method, closed_at = now(), updated_at = now()
  WHERE id = v_comanda_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.employee_get_comandas(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employee_open_comanda(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employee_save_comanda(UUID, INTEGER, JSONB, NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employee_close_comanda(UUID, INTEGER, TEXT) TO anon, authenticated;
