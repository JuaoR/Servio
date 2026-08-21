-- Evita 409 quando dois clientes tentam abrir/salvar a mesma comanda ao mesmo tempo.
-- A comanda aberta é única por restaurante+número.

CREATE OR REPLACE FUNCTION public.employee_open_comanda(p_token TEXT,p_number INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_restaurant_id UUID; v_comanda public.comandas;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.employee_sessions
  WHERE token=p_token AND expires_at>now()
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN RAISE EXCEPTION 'Sessão de funcionário inválida ou expirada'; END IF;
  IF p_number<1 OR p_number>100 THEN RAISE EXCEPTION 'Número de comanda inválido'; END IF;

  INSERT INTO public.comandas(restaurant_id,number,status,opened_at)
  VALUES(v_restaurant_id,p_number,'aberta',now())
  ON CONFLICT (restaurant_id,number) WHERE status='aberta' DO NOTHING;

  SELECT * INTO v_comanda
  FROM public.comandas
  WHERE restaurant_id=v_restaurant_id AND number=p_number AND status='aberta'
  LIMIT 1;

  RETURN jsonb_build_object(
    'id',v_comanda.number,
    'uuid',v_comanda.id,
    'status',v_comanda.status,
    'mesa',COALESCE(v_comanda.table_number,''),
    'garcom',COALESCE(v_comanda.waiter_id::text,''),
    'obs',COALESCE(v_comanda.notes,''),
    'openedAt',EXTRACT(EPOCH FROM v_comanda.opened_at)*1000,
    'discount',COALESCE(v_comanda.discount,0)
  );
END; $$;

CREATE OR REPLACE FUNCTION public.employee_save_comanda(p_token TEXT,p_number INTEGER,p_items JSONB,p_discount NUMERIC DEFAULT 0,p_mesa TEXT DEFAULT '',p_obs TEXT DEFAULT '')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_restaurant_id UUID; v_comanda public.comandas; v_subtotal NUMERIC:=0; v_item JSONB; v_product_restaurant UUID;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id FROM public.employee_sessions WHERE token=p_token AND expires_at>now() LIMIT 1;
  IF v_restaurant_id IS NULL THEN RAISE EXCEPTION 'Sessão de funcionário inválida ou expirada'; END IF;
  IF p_number<1 OR p_number>100 THEN RAISE EXCEPTION 'Número de comanda inválido'; END IF;
  IF jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Itens inválidos'; END IF;

  -- Primeiro garante a comanda; ON CONFLICT evita 409 em concorrência.
  INSERT INTO public.comandas(restaurant_id,number,status,opened_at)
  VALUES(v_restaurant_id,p_number,'aberta',now())
  ON CONFLICT (restaurant_id,number) WHERE status='aberta' DO NOTHING;

  SELECT * INTO v_comanda FROM public.comandas
  WHERE restaurant_id=v_restaurant_id AND number=p_number AND status='aberta'
  LIMIT 1;

  DELETE FROM public.comanda_items WHERE comanda_id=v_comanda.id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT restaurant_id INTO v_product_restaurant FROM public.products WHERE id=(v_item->>'pid')::UUID LIMIT 1;
    IF v_product_restaurant IS NULL OR v_product_restaurant<>v_restaurant_id THEN RAISE EXCEPTION 'Produto não pertence a este restaurante'; END IF;

    INSERT INTO public.comanda_items(comanda_id,product_id,name,price,quantity,notes)
    VALUES(v_comanda.id,(v_item->>'pid')::UUID,v_item->>'name',(v_item->>'price')::NUMERIC,GREATEST(1,(v_item->>'qty')::INTEGER),NULLIF(v_item->>'note',''));
    v_subtotal:=v_subtotal+((v_item->>'price')::NUMERIC*GREATEST(1,(v_item->>'qty')::INTEGER));
  END LOOP;

  UPDATE public.comandas
  SET table_number=COALESCE(p_mesa,''),notes=COALESCE(p_obs,''),discount=COALESCE(p_discount,0),subtotal=v_subtotal,total=GREATEST(0,v_subtotal-COALESCE(p_discount,0)),updated_at=now()
  WHERE id=v_comanda.id;

  RETURN jsonb_build_object('id',v_comanda.number,'uuid',v_comanda.id,'status','aberta','mesa',COALESCE(p_mesa,''),'garcom',COALESCE(v_comanda.waiter_id::text,''),'obs',COALESCE(p_obs,''),'openedAt',EXTRACT(EPOCH FROM v_comanda.opened_at)*1000,'discount',COALESCE(p_discount,0));
END; $$;

GRANT EXECUTE ON FUNCTION public.employee_open_comanda(TEXT,INTEGER) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.employee_save_comanda(TEXT,INTEGER,JSONB,NUMERIC,TEXT,TEXT) TO anon,authenticated;
