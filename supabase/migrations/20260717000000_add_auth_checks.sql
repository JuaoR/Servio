-- Adiciona funções RPC para validar a existência de e-mail e identificador em tempo real,
-- contornando as restrições do RLS para o fluxo de cadastro e recuperação de senha.

CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_exists BOOLEAN;
BEGIN
  -- Verifica na tabela auth.users do Supabase se o e-mail já está cadastrado
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  ) INTO email_exists;
  
  RETURN email_exists;
END;
$$;

CREATE OR REPLACE FUNCTION check_identifier_exists(identifier_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  identifier_exists BOOLEAN;
BEGIN
  -- Verifica se o identificador já existe na tabela restaurants
  SELECT EXISTS (
    SELECT 1 FROM restaurants WHERE id = identifier_to_check
  ) INTO identifier_exists;
  
  RETURN identifier_exists;
END;
$$;
