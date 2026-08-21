-- Final consistency fix for administrator comandas.
-- Serializes saves for the same restaurant/comanda so rapid clicks cannot
-- interleave transactions and leave comanda_items pointing at a deleted row.

CREATE OR REPLACE FUNCTION public.admin_save_comanda(
  p_restaurant_id uuid,
  p_number integer,
  p_items jsonb,
  p_discount numeric DEFAULT 0,
  p_mesa text DEFAULT '',
  p_obs text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed uuid;
  v_id uuid;
  v_opened_at timestamptz;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_discount numeric := GREATEST(0, COALESCE(p_discount, 0));
BEGIN
  SELECT restaurant_id INTO v_allowed
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_allowed IS NULL OR v_allowed <> p_restaurant_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Itens inválidos';
  END IF;

  -- One transaction at a time for each restaurant + comanda number.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_restaurant_id::text || ':' || p_number::text, 0)
  );

  SELECT id, opened_at
    INTO v_id, v_opened_at
  FROM public.comandas
  WHERE restaurant_id = p_restaurant_id
    AND number = p_number
    AND status = 'aberta'
  LIMIT 1
  FOR UPDATE;

  -- Empty means the comanda is free. Remove its items first, then the parent.
  IF jsonb_array_length(p_items) = 0 THEN
    IF v_id IS NOT NULL THEN
      DELETE FROM public.comanda_items WHERE comanda_id = v_id;
      DELETE FROM public.comandas WHERE id = v_id;
    END IF;
    RETURN jsonb_build_object('status','livre','number',p_number,'uuid',NULL);
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.comandas (
      restaurant_id, number, status, opened_at, table_number, notes, discount
    )
    VALUES (
      p_restaurant_id, p_number, 'aberta', now(),
      COALESCE(p_mesa,''), COALESCE(p_obs,''), v_discount
    )
    RETURNING id, opened_at INTO v_id, v_opened_at;
  ELSE
    UPDATE public.comandas
    SET table_number = COALESCE(p_mesa,''),
        notes = COALESCE(p_obs,''),
        discount = v_discount,
        updated_at = now()
    WHERE id = v_id;
  END IF;

  -- Replace the complete snapshot atomically. The advisory lock guarantees
  -- another rapid save for this same comanda cannot delete the parent midway.
  DELETE FROM public.comanda_items WHERE comanda_id = v_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.products
      WHERE id = (v_item->>'pid')::uuid
        AND restaurant_id = p_restaurant_id
    ) THEN
      RAISE EXCEPTION 'Produto não pertence ao restaurante';
    END IF;

    INSERT INTO public.comanda_items (
      comanda_id, product_id, name, price, quantity, notes
    )
    VALUES (
      v_id,
      (v_item->>'pid')::uuid,
      v_item->>'name',
      COALESCE((v_item->>'price')::numeric, 0),
      GREATEST(1, COALESCE((v_item->>'qty')::numeric, 1)),
      NULLIF(v_item->>'note','')
    );

    v_subtotal := v_subtotal
      + COALESCE((v_item->>'price')::numeric, 0)
      * GREATEST(1, COALESCE((v_item->>'qty')::numeric, 1));
  END LOOP;

  UPDATE public.comandas
  SET subtotal = v_subtotal,
      total = GREATEST(0, v_subtotal - v_discount),
      discount = v_discount,
      updated_at = now()
  WHERE id = v_id;

  RETURN jsonb_build_object(
    'status','aberta',
    'number',p_number,
    'uuid',v_id,
    'opened_at',v_opened_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_comanda(uuid,integer,jsonb,numeric,text,text) TO authenticated;

-- Accept all payment values currently used by the UI, plus the legacy values.
ALTER TABLE public.comandas
DROP CONSTRAINT IF EXISTS comandas_payment_method_check;

ALTER TABLE public.comandas
ADD CONSTRAINT comandas_payment_method_check
CHECK (
  payment_method IS NULL OR payment_method IN (
    'dinheiro', 'pix', 'cartao', 'credito', 'debito',
    'cartao_credito', 'cartao_debito', 'outro'
  )
);
