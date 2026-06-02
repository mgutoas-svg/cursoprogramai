-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin');

-- Tabela de papéis
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para checar papel
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies para user_roles: somente admins enxergam/gerenciam
CREATE POLICY "Admins leem papeis"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins inserem papeis"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins deletam papeis"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reescrever policies das tabelas de negócio para exigir admin
DROP POLICY IF EXISTS "Autenticados atualizam demandas" ON public.demandas;
DROP POLICY IF EXISTS "Autenticados deletam demandas" ON public.demandas;
DROP POLICY IF EXISTS "Autenticados leem demandas" ON public.demandas;

CREATE POLICY "Admins leem demandas"
  ON public.demandas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam demandas"
  ON public.demandas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins deletam demandas"
  ON public.demandas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Autenticados gerenciam veiculos" ON public.veiculos;
CREATE POLICY "Admins gerenciam veiculos"
  ON public.veiculos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Autenticados gerenciam manutencao" ON public.manutencao_preventiva;
CREATE POLICY "Admins gerenciam manutencao"
  ON public.manutencao_preventiva FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Autenticados gerenciam custos" ON public.custos;
CREATE POLICY "Admins gerenciam custos"
  ON public.custos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));