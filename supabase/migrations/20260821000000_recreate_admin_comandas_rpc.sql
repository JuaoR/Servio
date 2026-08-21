-- Recreate admin comandas RPCs in case the previous migration was recorded
-- as applied while the functions were missing from the remote database.

CREATE OR REPLACE FUNCTION public.admin_get_open_comandas(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'uuid', c.id,
    'number', c.number,
    'status', c.status,
    'opened_at', c.opened_at,
    'table_number', c.table_number,
    'notes', c.notes,
    'discount', COALESCE(c.discount,0),
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', i.id,
      'pid', i.product_id,
      'product_id', i.product_id,
      'name', i.name,
      'price', i.price,
      'qty', i.quantity,
      'quantity', i.quantity,
      'note', i.notes
    ) ORDER BY i.id) FROM public.comanda_items i WHERE i.comanda_id=c.id), '[]'::jsonb)
  ) ORDER BY c.number), '[]'::jsonb)
  INTO result
  FROM public.comandas c
  WHERE c.restaurant_id=p_restaurant_id
    AND c.status='aberta'
    AND EXISTS (SELECT 1 FROM public.comanda_items i WHERE i.comanda_id=c.id);
  RETURN result;
END;
$$;

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
  v_id uuid;
  v_count integer;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
BEGIN
  IF p_items IS NULL THEN p_items := '[]'::jsonb; END IF;
  SELECT count(*) INTO v_count FROM jsonb_array_elements(p_items);

  SELECT id INTO v_id FROM public.comandas
  WHERE restaurant_id=p_restaurant_id AND number=p_number AND status='aberta'
  ORDER BY opened_at DESC NULLS LAST LIMIT 1
  FOR UPDATE;

  IF v_count = 0 THEN
    IF v_id IS NOT NULL THEN
      DELETE FROM public.comandas WHERE id=v_id;
    END IF;
    RETURN jsonb_build_object('status','livre','uuid',NULL);
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.comandas(restaurant_id,number,status,opened_at,table_number,notes,discount)
    VALUES(p_restaurant_id,p_number,'aberta',now(),NULLIF(p_mesa,''),NULLIF(p_obs,''),COALESCE(p_discount,0))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.comandas SET table_number=NULLIF(p_mesa,''),notes=NULLIF(p_obs,''),discount=COALESCE(p_discount,0),updated_at=now() WHERE id=v_id;
  END IF;

  DELETE FROM public.comanda_items WHERE comanda_id=v_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.comanda_items(comanda_id,product_id,name,price,quantity,notes)
    VALUES(v_id,(v_item->>'pid')::uuid,v_item->>'name',COALESCE((v_item->>'price')::numeric,0),GREATEST(1,COALESCE((v_item->>'qty')::integer,1)),NULLIF(v_item->>'note',''));
    v_subtotal := v_subtotal + COALESCE((v_item->>'price')::numeric,0) * GREATEST(1,COALESCE((v_item->>'qty')::integer,1));
  END LOOP;
  v_total := GREATEST(0,v_subtotal-COALESCE(p_discount,0));
  UPDATE public.comandas SET subtotal=v_subtotal,total=v_total,discount=COALESCE(p_discount,0),updated_at=now() WHERE id=v_id;
  RETURN jsonb_build_object('status','aberta','uuid',v_id,'opened_at',(SELECT opened_at FROM public.comandas WHERE id=v_id));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_open_comandas(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_comanda(uuid,integer,jsonb,numeric,text,text) TO anon, authenticated;
