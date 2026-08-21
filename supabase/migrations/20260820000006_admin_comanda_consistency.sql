-- Administrador: uma comanda aberta só existe enquanto possuir pelo menos um item.
-- Remove registros abertos vazios já existentes.
DELETE FROM public.comandas c
WHERE c.status = 'aberta'
  AND NOT EXISTS (SELECT 1 FROM public.comanda_items ci WHERE ci.comanda_id = c.id);

-- Quando o último item é removido de uma comanda aberta, a comanda deixa de existir.
CREATE OR REPLACE FUNCTION public.remove_empty_open_comanda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.comandas c
  WHERE c.id = OLD.comanda_id
    AND c.status = 'aberta'
    AND NOT EXISTS (
      SELECT 1 FROM public.comanda_items ci WHERE ci.comanda_id = OLD.comanda_id
    );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_remove_empty_open_comanda ON public.comanda_items;
CREATE TRIGGER trg_remove_empty_open_comanda
AFTER DELETE ON public.comanda_items
FOR EACH ROW
EXECUTE FUNCTION public.remove_empty_open_comanda();
