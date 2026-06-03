ALTER PUBLICATION supabase_realtime DROP TABLE public.demandas;

REVOKE EXECUTE ON FUNCTION public.auto_lancar_custo_demanda() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "Qualquer um pode fazer upload de midias" ON storage.objects;

CREATE POLICY "Autenticados fazem upload de midias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'manutencao-midias');

CREATE POLICY "Admins atualizam midias"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'manutencao-midias' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'manutencao-midias' AND public.has_role(auth.uid(), 'admin'));