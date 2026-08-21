-- Consolidate duplicate product rows created by previous interrupted writes.
DO $$
BEGIN
  DELETE FROM public.comanda_items a
  USING public.comanda_items b
  WHERE a.id > b.id
    AND a.comanda_id = b.comanda_id
    AND a.product_id = b.product_id;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_comanda_product_idx
ON public.comanda_items (comanda_id, product_id);

CREATE OR REPLACE FUNCTION public.admin_get_open_comandas(p_restaurant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_allowed UUID;
BEGIN
  SELECT restaurant_id INTO v_allowed
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin';
  IF v_allowed IS NULL OR v_allowed <> p_restaurant_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'number', c.number,
        'status', c.status,
        'table_number', COALESCE(c.table_number,''),
        'waiter_id', COALESCE(c.waiter_id::text,''),
        'notes', COALESCE(c.notes,''),
        'opened_at', c.opened_at,
        'discount', COALESCE(c.discount,0),
        'subtotal', COALESCE(c.subtotal,0),
        'total', COALESCE(c.total,0),
        'items', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', i.id,
            'product_id', i.product_id,
            'name', i.name,
            'price', i.price,
            'quantity', i.quantity,
            'notes', COALESCE(i.notes,'')
          ) ORDER BY i.created_at, i.id)
          FROM public.comanda_items i
          WHERE i.comanda_id = c.id
        ), '[]'::jsonb)
      ) ORDER BY c.number
    )
    FROM public.comandas c
    WHERE c.restaurant_id = p_restaurant_id
      AND c.status = 'aberta'
      AND EXISTS (SELECT 1 FROM public.comanda_items i WHERE i.comanda_id = c.id)
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_comanda(
  p_restaurant_id UUID,
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
  v_allowed UUID;
  v_comanda public.comandas;
  v_item JSONB;
  v_subtotal NUMERIC := 0;
BEGIN
  SELECT restaurant_id INTO v_allowed
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin';
  IF v_allowed IS NULL OR v_allowed <> p_restaurant_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Itens inválidos'; END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    DELETE FROM public.comandas
    WHERE restaurant_id = p_restaurant_id AND number = p_number AND status = 'aberta';
    RETURN jsonb_build_object('status','livre','number',p_number,'items',jsonb_build_array());
  END IF;

  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE restaurant_id = p_restaurant_id AND number = p_number AND status = 'aberta'
  FOR UPDATE;

  IF v_comanda.id IS NULL THEN
    INSERT INTO public.comandas (restaurant_id, number, status, opened_at)
    VALUES (p_restaurant_id, p_number, 'aberta', now())
    RETURNING * INTO v_comanda;
  END IF;

  DELETE FROM public.comanda_items WHERE comanda_id = v_comanda.id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.products
      WHERE id = (v_item->>'pid')::uuid AND restaurant_id = p_restaurant_id
    ) THEN
      RAISE EXCEPTION 'Produto não pertence ao restaurante';
    END IF;
    INSERT INTO public.comanda_items (comanda_id, product_id, name, price, quantity, notes)
    VALUES (
      v_comanda.id,
      (v_item->>'pid')::uuid,
      v_item->>'name',
      (v_item->>'price')::numeric,
      GREATEST(1, (v_item->>'qty')::numeric),
      NULLIF(v_item->>'note','')
    )
    ON CONFLICT (comanda_id, product_id) DO UPDATE
      SET quantity = EXCLUDED.quantity,
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          notes = EXCLUDED.notes;
    v_subtotal := v_subtotal + ((v_item->>'price')::numeric * GREATEST(1, (v_item->>'qty')::numeric));
  END LOOP;

  UPDATE public.comandas
  SET table_number = COALESCE(p_mesa,''),
      notes = COALESCE(p_obs,''),
      discount = GREATEST(0, COALESCE(p_discount,0)),
      subtotal = v_subtotal,
      total = GREATEST(0, v_subtotal - GREATEST(0, COALESCE(p_discount,0))),
      updated_at = now()
  WHERE id = v_comanda.id;

  RETURN jsonb_build_object('status','aberta','number',p_number,'uuid',v_comanda.id,'opened_at',v_comanda.opened_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_open_comandas(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_comanda(UUID,INTEGER,JSONB,NUMERIC,TEXT,TEXT) TO authenticated;
