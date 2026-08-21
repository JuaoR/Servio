-- Employee access through SECURITY DEFINER RPCs.
-- Employee login uses employee_sessions instead of Supabase Auth, so normal RLS
-- policies based on auth.uid() cannot identify the employee's restaurant.

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
BEGIN
  SELECT * INTO v_session
  FROM public.employee_sessions
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_restaurant
  FROM public.restaurants
  WHERE id = v_session.restaurant_id;

  SELECT * INTO v_waiter
  FROM public.waiters
  WHERE id = v_session.waiter_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.name), '[]'::jsonb)
    INTO v_categories
  FROM public.categories c
  WHERE c.restaurant_id = v_session.restaurant_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.name), '[]'::jsonb)
    INTO v_products
  FROM public.products p
  WHERE p.restaurant_id = v_session.restaurant_id;

  RETURN jsonb_build_object(
    'restaurant_id', v_session.restaurant_id,
    'restaurant', jsonb_build_object(
      'name', v_restaurant.name,
      'owner_name', v_restaurant.owner_name,
      'logo_url', v_restaurant.logo_url
    ),
    'waiter', jsonb_build_object(
      'id', v_waiter.id,
      'name', v_waiter.name,
      'code', v_waiter.code
    ),
    'categories', v_categories,
    'products', v_products
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_context(TEXT) TO anon, authenticated;
