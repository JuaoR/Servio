-- SERVIO: permissões de funcionários
-- Funcionários podem ler produtos/categorias e operar comandas,
-- mas somente admins podem alterar produtos/categorias.

DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  ) WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  ) WITH CHECK (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );

CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (
    restaurant_id = public.get_user_restaurant_id()
    AND public.is_admin()
  );
