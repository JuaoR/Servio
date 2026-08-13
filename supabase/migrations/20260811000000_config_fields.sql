-- Adiciona campos de configuração à tabela de restaurantes

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS identifier TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';

-- Adiciona campos de configuração de impressão
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS print_printer_type TEXT DEFAULT 'usb',
ADD COLUMN IF NOT EXISTS print_paper_width TEXT DEFAULT '80mm',
ADD COLUMN IF NOT EXISTS print_auto_print BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS print_comandas BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_pedidos BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_fechamento BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_header TEXT,
ADD COLUMN IF NOT EXISTS print_footer TEXT,
ADD COLUMN IF NOT EXISTS print_show_name BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_show_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS print_show_address BOOLEAN DEFAULT true;

-- Cria bucket de storage para logos se não existir (apenas PostgreSQL DDL para Storage exige extensões ou SQL direto)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket
CREATE POLICY "Logos publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'restaurant-logos');

CREATE POLICY "Users can upload logos to their restaurant" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'restaurant-logos' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'restaurant-logos' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'restaurant-logos' AND 
  auth.uid() IS NOT NULL
);
