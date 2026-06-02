import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OCR_SCHEMAS = {
  veiculo: {
    name: "extract_veiculo",
    description: "Extrai dados de documento veicular (CRLV ou multa).",
    parameters: {
      type: "object",
      properties: {
        placa: { type: "string", description: "Placa no formato AAA-0000 ou AAA0A00" },
        modelo: { type: "string" },
        ano: { type: "number" },
        vencimento_ipva: { type: "string", description: "ISO date YYYY-MM-DD se encontrado" },
        vencimento_licenciamento: { type: "string", description: "ISO date YYYY-MM-DD" },
        vencimento_seguro: { type: "string", description: "ISO date YYYY-MM-DD" },
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

export const extrairOCR = createServerFn({ method: "POST" })
  .inputValidator((d: { imageBase64: string; mimeType: string; tipo: "veiculo" | "nota" }) =>
    z.object({
      imageBase64: z.string().min(10),
      mimeType: z.string().min(3),
      tipo: z.enum(["veiculo", "nota"]),
    }).parse(d)
  )
  .handler(async ({ data }) => {
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
