
DROP POLICY IF EXISTS "Qualquer um pode criar demandas" ON public.demandas;
CREATE POLICY "Qualquer um pode criar demandas" ON public.demandas
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    cliente_nome IS NOT NULL AND length(btrim(cliente_nome)) BETWEEN 2 AND 200
    AND descricao IS NOT NULL AND length(btrim(descricao)) BETWEEN 5 AND 5000
  );

DROP POLICY IF EXISTS "Public form uploads demandas" ON storage.objects;
CREATE POLICY "Public form uploads demandas" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'manutencao-midias'
    AND (storage.foldername(name))[1] = 'demandas'
    AND length(name) <= 300
    AND lower(name) ~ '\.(jpg|jpeg|png|webp|heic|pdf|mp4|mov)$'
  );
