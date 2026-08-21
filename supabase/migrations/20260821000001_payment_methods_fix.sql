-- Allow the payment methods used by the Servio checkout UI.
-- Keep the existing legacy values for compatibility.
ALTER TABLE public.comandas
DROP CONSTRAINT IF EXISTS comandas_payment_method_check;

ALTER TABLE public.comandas
ADD CONSTRAINT comandas_payment_method_check
CHECK (
  payment_method IS NULL
  OR payment_method IN (
    'dinheiro',
    'pix',
    'cartao',
    'cartao_credito',
    'cartao_debito',
    'outro'
  )
);
