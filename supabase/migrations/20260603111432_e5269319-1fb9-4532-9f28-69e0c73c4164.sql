-- Tighten storage.objects policies on private 'manutencao-midias' bucket: admin-only
DROP POLICY IF EXISTS "Autenticados fazem upload de midias" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados deletam midias" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados leem midias" ON storage.objects;

CREATE POLICY "Admins leem midias"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'manutencao-midias' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins fazem upload de midias"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'manutencao-midias' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins deletam midias"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'manutencao-midias' AND public.has_role(auth.uid(), 'admin'::public.app_role));
