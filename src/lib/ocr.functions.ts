import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin.functions";

const OCR_SCHEMAS = {
  veiculo: {
    name: "extract_veiculo_crlv",
    description: "Extrai todos os dados de um CRLV (Certificado de Registro e Licenciamento de Veículo) brasileiro.",
    parameters: {
      type: "object",
      properties: {
        placa: { type: "string", description: "Placa atual no formato AAA0A00 ou AAA-0000" },
        renavam: { type: "string", description: "Código RENAVAM" },
        exercicio: { type: "number", description: "Ano de exercício do licenciamento" },
        ano_fabricacao: { type: "number" },
        ano_modelo: { type: "number" },
        numero_crv: { type: "string", description: "Número do CRV" },
        codigo_seguranca_cla: { type: "string", description: "Código de segurança do CLA" },
        cat: { type: "string", description: "Sigla CAT" },
        categoria: { type: "string", description: "Categoria do veículo (ex: PARTICULAR, ALUGUEL)" },
        modelo: { type: "string", description: "MARCA / MODELO / VERSÃO completo, ex: VW/NEOBUS THUNDER" },
        especie_tipo: { type: "string", description: "Espécie / Tipo (ex: PASSAGEIRO ONIBUS)" },
        placa_anterior: { type: "string", description: "Placa anterior com UF, ex: ABC1234/PE" },
        chassi: { type: "string" },
        cor_predominante: { type: "string" },
        combustivel: { type: "string" },
        capacidade: { type: "string" },
        potencia_cilindrada: { type: "string", description: "ex: 145CV/4300" },
        peso_bruto_total: { type: "string" },
        motor: { type: "string" },
        cmt: { type: "string", description: "Capacidade Máxima de Tração" },
        eixos: { type: "number" },
        lotacao: { type: "string", description: "ex: 26P" },
        carroceria: { type: "string" },
        proprietario_nome: { type: "string", description: "Nome do proprietário" },
        proprietario_cpf_cnpj: { type: "string", description: "CPF ou CNPJ do proprietário" },
        local_emissao: { type: "string", description: "Município/UF de emissão" },
        data_emissao: { type: "string", description: "Data ISO YYYY-MM-DD" },
        valor: { type: "number", description: "Valor total se for multa" },
      },
      required: [],
    },
  },
  nota: {
    name: "extract_nota_fiscal",
    description: "Extrai dados de nota fiscal ou recibo de serviço.",
    parameters: {
      type: "object",
      properties: {
        data_gasto: { type: "string", description: "Data ISO YYYY-MM-DD" },
        prestador_oficina: { type: "string" },
        valor: { type: "number" },
        placa: { type: "string", description: "Placa se referenciada na nota" },
        descricao: { type: "string", description: "Resumo do serviço ou produto" },
      },
      required: [],
    },
  },
} as const;

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin.functions";

export const extrairOCR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { imageBase64: string; mimeType: string; tipo: "veiculo" | "nota" }) =>
    z.object({
      imageBase64: z.string().min(10),
      mimeType: z.string().min(3),
      tipo: z.enum(["veiculo", "nota"]),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { error: "LOVABLE_API_KEY ausente." };
    }
    const schema = OCR_SCHEMAS[data.tipo];
    const systemPrompt = data.tipo === "veiculo"
      ? "Você é um assistente que extrai dados de documentos veiculares brasileiros (CRLV/multas)."
      : "Você é um assistente que extrai dados de notas fiscais e recibos de serviços automotivos.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os campos disponíveis. Use null se não encontrar." },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
            ],
          },
        ],
        tools: [{ type: "function", function: schema }],
        tool_choice: { type: "function", function: { name: schema.name } },
      }),
    });

    if (res.status === 429) return { error: "Limite de uso da IA atingido. Tente em alguns minutos." };
    if (res.status === 402) return { error: "Créditos da IA esgotados. Adicione créditos no workspace." };
    if (!res.ok) {
      const text = await res.text();
      console.error("OCR error", res.status, text);
      return { error: `Erro na IA (${res.status})` };
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return { error: "IA não retornou dados estruturados." };
    try {
      const parsed = JSON.parse(call.function.arguments);
      return { data: parsed };
    } catch {
      return { error: "Falha ao decodificar resposta da IA." };
    }
  });
