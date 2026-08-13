-- ==========================================
-- SERVIO - MIGRATION 20260724000000_DELETE_ACCOUNT
-- Permite que usuários administradores excluam suas contas e todos os dados associados
-- ==========================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_restaurant_id UUID;
BEGIN
  -- Obter o ID do usuário autenticado atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Obter o ID do restaurante do administrador
  SELECT restaurant_id INTO v_restaurant_id 
  FROM public.profiles 
  WHERE id = v_user_id;

  -- Se o restaurante existir, deletamos ele.
  -- O cascade delete configurado no banco de dados se encarregará de limpar
  -- todas as tabelas associadas: categories, products, waiters, comandas, comanda_items, etc.
  IF v_restaurant_id IS NOT NULL THEN
    DELETE FROM public.restaurants WHERE id = v_restaurant_id;
  END IF;

  -- Por fim, deleta o usuário da tabela do Supabase Auth
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;
