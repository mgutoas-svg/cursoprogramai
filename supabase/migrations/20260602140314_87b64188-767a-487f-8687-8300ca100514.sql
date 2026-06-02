ALTER TABLE public.demandas ADD COLUMN whatsapp_contato TEXT;

UPDATE public.demandas SET whatsapp_contato = '' WHERE whatsapp_contato IS NULL;

COMMENT ON COLUMN public.demandas.whatsapp_contato IS 'Número de WhatsApp para contato sobre a demanda';