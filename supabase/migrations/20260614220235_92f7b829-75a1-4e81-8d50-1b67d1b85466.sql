
-- Restore missing GRANTs on demandas (Data API needs explicit grants)
GRANT INSERT ON public.demandas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT ALL ON public.demandas TO service_role;

-- Also ensure grants exist for the other public tables (no-ops if already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencao_preventiva TO authenticated;
GRANT ALL ON public.manutencao_preventiva TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos TO authenticated;
GRANT ALL ON public.custos TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Allow anonymous (public form) uploads to the demandas/ prefix of the manutencao-midias bucket
DROP POLICY IF EXISTS "Public form uploads demandas" ON storage.objects;
CREATE POLICY "Public form uploads demandas"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'manutencao-midias'
    AND (storage.foldername(name))[1] = 'demandas'
  );
