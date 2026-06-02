
REVOKE EXECUTE ON FUNCTION public.auto_lancar_custo_demanda() FROM anon, authenticated, public;

-- Storage policies for manutencao-midias bucket
CREATE POLICY "Qualquer um pode fazer upload de midias"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'manutencao-midias');

CREATE POLICY "Autenticados leem midias"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'manutencao-midias');

CREATE POLICY "Autenticados deletam midias"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'manutencao-midias');
