ALTER TABLE public.demandas ADD COLUMN nome_responsavel TEXT;

UPDATE public.demandas SET nome_responsavel = '' WHERE nome_responsavel IS NULL;

COMMENT ON COLUMN public.demandas.nome_responsavel IS 'Nome do responsável pelo chamado no cliente';