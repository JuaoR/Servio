-- Inclui comandas abertas no contexto já utilizado pelo funcionário.
-- Isso evita depender da RPC separada employee_get_comandas.

CREATE OR REPLACE FUNCTION public.get_employee_context(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.employee_sessions%ROWTYPE;
  v_restaurant public.restaurants%ROWTYPE;
  v_waiter public.waiters%ROWTYPE;
  v_categories JSONB;
  v_products JSONB;
  v_comandas JSONB;
BEGIN
  SELECT * INTO v_session
  FROM public.employee_sessions
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_restaurant FROM public.restaurants WHERE id = v_session.restaurant_id;
  SELECT * INTO v_waiter FROM public.waiters WHERE id = v_session.waiter_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.name), '[]'::jsonb)
  INTO v_categories FROM public.categories c WHERE c.restaurant_id = v_session.restaurant_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.name), '[]'::jsonb)
  INTO v_products FROM public.products p WHERE p.restaurant_id = v_session.restaurant_id;

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
        FROM public.comanda_items ci WHERE ci.comanda_id = c.id
      ), '[]'::jsonb)
    ) ORDER BY c.number
  ), '[]'::jsonb)
  INTO v_comandas
  FROM public.comandas c
  WHERE c.restaurant_id = v_session.restaurant_id AND c.status = 'aberta';

  RETURN jsonb_build_object(
    'restaurant_id', v_session.restaurant_id,
    'restaurant', jsonb_build_object('name', v_restaurant.name, 'owner_name', v_restaurant.owner_name, 'logo_url', v_restaurant.logo_url),
    'waiter', jsonb_build_object('id', v_waiter.id, 'name', v_waiter.name, 'code', v_waiter.code),
    'categories', v_categories,
    'products', v_products,
    'comandas', v_comandas
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_context(TEXT) TO anon, authenticated;
