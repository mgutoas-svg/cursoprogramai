
-- Tabela demandas
CREATE TABLE public.demandas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  cliente_nome text NOT NULL,
  local_obra text NOT NULL,
  descricao text NOT NULL,
  foto_geral_url text[] DEFAULT '{}',
  foto_peca_url text[] DEFAULT '{}',
  orcamento_url text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'Pendente',
  urgencia text NOT NULL DEFAULT 'Médio',
  prestador_oficina text,
  valor_reparo numeric(10,2),
  prazo_resolucao date,
  notas_pesquisa text,
  custo_lancado boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandas TO authenticated;
GRANT INSERT ON public.demandas TO anon;
GRANT ALL ON public.demandas TO service_role;

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar demandas" ON public.demandas
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Autenticados leem demandas" ON public.demandas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados atualizam demandas" ON public.demandas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados deletam demandas" ON public.demandas
  FOR DELETE TO authenticated USING (true);

-- Tabela veiculos
CREATE TABLE public.veiculos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  placa text NOT NULL UNIQUE,
  modelo text NOT NULL,
  ano integer,
  obra_alocado text,
  vencimento_ipva date,
  vencimento_licenciamento date,
  vencimento_seguro date,
  crlv_url text,
  historico_multas_url text[] DEFAULT '{}'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;

ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam veiculos" ON public.veiculos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tabela manutencao_preventiva
CREATE TABLE public.manutencao_preventiva (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  veiculo_id uuid NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  item text NOT NULL,
  km_ultima_troca integer,
  km_atual integer,
  km_proxima_troca integer,
  data_proxima_revisao date,
  status_item text DEFAULT 'OK'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencao_preventiva TO authenticated;
GRANT ALL ON public.manutencao_preventiva TO service_role;

ALTER TABLE public.manutencao_preventiva ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam manutencao" ON public.manutencao_preventiva
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tabela custos
CREATE TABLE public.custos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  data_gasto date NOT NULL,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  categoria text NOT NULL,
  descricao text NOT NULL,
  valor numeric(10,2) NOT NULL,
  prestador_oficina text,
  comprovante_url text,
  demanda_id uuid REFERENCES public.demandas(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos TO authenticated;
GRANT ALL ON public.custos TO service_role;

ALTER TABLE public.custos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam custos" ON public.custos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime para demandas
ALTER PUBLICATION supabase_realtime ADD TABLE public.demandas;
ALTER TABLE public.demandas REPLICA IDENTITY FULL;

-- Trigger: ao concluir demanda com valor, lançar custo automaticamente
CREATE OR REPLACE FUNCTION public.auto_lancar_custo_demanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Concluído'
     AND NEW.valor_reparo IS NOT NULL
     AND NEW.valor_reparo > 0
     AND NEW.custo_lancado = false THEN
    INSERT INTO public.custos (data_gasto, categoria, descricao, valor, prestador_oficina, demanda_id)
    VALUES (
      CURRENT_DATE,
      'Manutenção Corretiva',
      'Demanda: ' || NEW.cliente_nome || ' - ' || NEW.local_obra,
      NEW.valor_reparo,
      NEW.prestador_oficina,
      NEW.id
    );
    NEW.custo_lancado := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_custo_demanda
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_lancar_custo_demanda();
