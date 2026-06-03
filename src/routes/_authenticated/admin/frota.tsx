import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, Truck, FileText } from "lucide-react";
import { uploadFile } from "@/lib/storage";
import { useServerFn } from "@tanstack/react-start";
import { extrairOCR } from "@/lib/ocr.functions";

export const Route = createFileRoute("/_authenticated/admin/frota")({
  head: () => ({ meta: [{ title: "Frota — OperaFlow" }] }),
  component: FrotaPage,
});

type Veiculo = {
  id: string;
  placa: string;
  modelo: string;
  renavam: string | null;
  exercicio: number | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  numero_crv: string | null;
  codigo_seguranca_cla: string | null;
  cat: string | null;
  categoria: string | null;
  especie_tipo: string | null;
  placa_anterior: string | null;
  chassi: string | null;
  cor_predominante: string | null;
  combustivel: string | null;
  capacidade: string | null;
  potencia_cilindrada: string | null;
  peso_bruto_total: string | null;
  motor: string | null;
  cmt: string | null;
  eixos: number | null;
  lotacao: string | null;
  carroceria: string | null;
  proprietario_nome: string | null;
  proprietario_cpf_cnpj: string | null;
  local_emissao: string | null;
  data_emissao: string | null;
  crlv_url: string | null;
};

const CRLV_FIELDS: { key: keyof Veiculo; label: string }[] = [
  { key: "renavam", label: "RENAVAM" },
  { key: "exercicio", label: "Exercício" },
  { key: "ano_fabricacao", label: "Ano fabricação" },
  { key: "ano_modelo", label: "Ano modelo" },
  { key: "numero_crv", label: "Nº do CRV" },
  { key: "codigo_seguranca_cla", label: "Cód. segurança CLA" },
  { key: "cat", label: "CAT" },
  { key: "categoria", label: "Categoria" },
  { key: "especie_tipo", label: "Espécie / Tipo" },
  { key: "placa_anterior", label: "Placa anterior" },
  { key: "chassi", label: "Chassi" },
  { key: "cor_predominante", label: "Cor predominante" },
  { key: "combustivel", label: "Combustível" },
  { key: "capacidade", label: "Capacidade" },
  { key: "potencia_cilindrada", label: "Potência / Cilindrada" },
  { key: "peso_bruto_total", label: "Peso bruto total" },
  { key: "motor", label: "Motor" },
  { key: "cmt", label: "CMT" },
  { key: "eixos", label: "Eixos" },
  { key: "lotacao", label: "Lotação" },
  { key: "carroceria", label: "Carroceria" },
  { key: "proprietario_nome", label: "Proprietário" },
  { key: "proprietario_cpf_cnpj", label: "CPF / CNPJ" },
  { key: "local_emissao", label: "Local de emissão" },
  { key: "data_emissao", label: "Data de emissão" },
];

function FrotaPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Veiculo | null>(null);

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase.from("veiculos").select("*").order("placa");
    if (error) toast.error(error.message);
    else setVeiculos((data ?? []) as unknown as Veiculo[]);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Frota & Documentos</h1>
          <p className="text-sm text-muted-foreground">Cadastre veículos com os dados completos do CRLV.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo veículo</Button>
          </DialogTrigger>
          <VeiculoForm onSaved={() => { setOpen(false); fetchAll(); }} />
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : veiculos.length === 0 ? (
        <Card className="p-10 text-center">
          <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum veículo cadastrado ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {veiculos.map((v) => (
            <Card key={v.id} className="p-4 space-y-2 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setDetail(v)}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-lg font-bold tracking-wider">{v.placa}</div>
                  <div className="text-sm text-muted-foreground truncate">{v.modelo} {v.ano_modelo ?? ""}</div>
                </div>
                <Truck className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {v.renavam && <div><span className="font-semibold">RENAVAM:</span> {v.renavam}</div>}
                {v.chassi && <div className="truncate"><span className="font-semibold">Chassi:</span> {v.chassi}</div>}
                {v.cor_predominante && <div><span className="font-semibold">Cor:</span> {v.cor_predominante}</div>}
                {v.combustivel && <div><span className="font-semibold">Comb.:</span> {v.combustivel}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        {detail && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono">{detail.placa}</span>
                <span className="text-sm font-normal text-muted-foreground">— {detail.modelo}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CRLV_FIELDS.map(({ key, label }) => {
                const val = detail[key];
                return (
                  <div key={key} className="rounded border border-border p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="text-sm font-medium">
                      {val === null || val === "" ? "—" : key === "data_emissao" ? new Date(String(val)).toLocaleDateString("pt-BR") : String(val)}
                    </div>
                  </div>
                );
              })}
            </div>
            {detail.crlv_url && (
              <a href={detail.crlv_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2">
                <FileText className="h-4 w-4" /> Ver CRLV anexado
              </a>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function FormField({ label, type = "text", className = "", value, onChange }: { k: string; label: string; type?: string; className?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}


type FormState = {
  placa: string; modelo: string;
  renavam: string; exercicio: string; ano_fabricacao: string; ano_modelo: string;
  numero_crv: string; codigo_seguranca_cla: string; cat: string; categoria: string;
  especie_tipo: string; placa_anterior: string; chassi: string; cor_predominante: string;
  combustivel: string; capacidade: string; potencia_cilindrada: string; peso_bruto_total: string;
  motor: string; cmt: string; eixos: string; lotacao: string; carroceria: string;
  proprietario_nome: string; proprietario_cpf_cnpj: string; local_emissao: string; data_emissao: string;
};

const EMPTY_FORM: FormState = {
  placa: "", modelo: "", renavam: "", exercicio: "", ano_fabricacao: "", ano_modelo: "",
  numero_crv: "", codigo_seguranca_cla: "", cat: "", categoria: "", especie_tipo: "",
  placa_anterior: "", chassi: "", cor_predominante: "", combustivel: "", capacidade: "",
  potencia_cilindrada: "", peso_bruto_total: "", motor: "", cmt: "", eixos: "", lotacao: "",
  carroceria: "", proprietario_nome: "", proprietario_cpf_cnpj: "", local_emissao: "", data_emissao: "",
};

function VeiculoForm({ onSaved }: { onSaved: () => void }) {
  const ocrFn = useServerFn(extrairOCR);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [crlvFile, setCrlvFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof FormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleScan(file: File) {
    setScanning(true);
    try {
      const b64 = await fileToBase64(file);
      const result = await ocrFn({ data: { imageBase64: b64, mimeType: file.type || "image/jpeg", tipo: "veiculo" } });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("data" in result) {
        const d: Record<string, unknown> = result.data ?? {};
        setForm((f) => {
          const next = { ...f };
          (Object.keys(EMPTY_FORM) as (keyof FormState)[]).forEach((k) => {
            if (d[k] !== undefined && d[k] !== null && d[k] !== "") {
              next[k] = String(d[k]);
            }
          });
          return next;
        });
        toast.success("Dados extraídos! Confira antes de salvar.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  async function save() {
    if (!form.placa || !form.modelo) {
      toast.error("Placa e Marca/Modelo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      let crlv_url: string | null = null;
      if (crlvFile) crlv_url = await uploadFile(crlvFile, "veiculos/crlv");
      const num = (s: string) => (s ? parseInt(s) : null);
      const str = (s: string) => (s ? s : null);
      const { error } = await supabase.from("veiculos").insert({
        placa: form.placa.toUpperCase(),
        modelo: form.modelo,
        renavam: str(form.renavam),
        exercicio: num(form.exercicio),
        ano_fabricacao: num(form.ano_fabricacao),
        ano_modelo: num(form.ano_modelo),
        numero_crv: str(form.numero_crv),
        codigo_seguranca_cla: str(form.codigo_seguranca_cla),
        cat: str(form.cat),
        categoria: str(form.categoria),
        especie_tipo: str(form.especie_tipo),
        placa_anterior: str(form.placa_anterior),
        chassi: str(form.chassi),
        cor_predominante: str(form.cor_predominante),
        combustivel: str(form.combustivel),
        capacidade: str(form.capacidade),
        potencia_cilindrada: str(form.potencia_cilindrada),
        peso_bruto_total: str(form.peso_bruto_total),
        motor: str(form.motor),
        cmt: str(form.cmt),
        eixos: num(form.eixos),
        lotacao: str(form.lotacao),
        carroceria: str(form.carroceria),
        proprietario_nome: str(form.proprietario_nome),
        proprietario_cpf_cnpj: str(form.proprietario_cpf_cnpj),
        local_emissao: str(form.local_emissao),
        data_emissao: form.data_emissao || null,
        crlv_url,
      });
      if (error) throw error;
      toast.success("Veículo cadastrado");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ k, label, type = "text", className = "" }: { k: keyof FormState; label: string; type?: string; className?: string }) => (
    <FormField k={k} label={label} type={type} className={className} value={form[k]} onChange={(v) => setField(k, v)} />
  );




  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Novo veículo</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Escanear CRLV com IA (preenche todos os campos)</span>
          </div>
          <Input
            type="file"
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) { setCrlvFile(f); await handleScan(f); }
            }}
            disabled={scanning}
          />
          {scanning && (
            <div className="mt-3 flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> IA extraindo dados...
            </div>
          )}
        </div>

        <div className="text-xs font-semibold uppercase text-muted-foreground">Identificação</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field k="placa" label="Placa *" />
          <Field k="renavam" label="RENAVAM" />
          <Field k="exercicio" label="Exercício" type="number" />
          <Field k="numero_crv" label="Nº do CRV" />
          <Field k="codigo_seguranca_cla" label="Cód. segurança CLA" />
          <Field k="placa_anterior" label="Placa anterior" />
        </div>

        <div className="text-xs font-semibold uppercase text-muted-foreground">Veículo</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-3">
            <Field k="modelo" label="Marca / Modelo / Versão *" />
          </div>
          <Field k="ano_fabricacao" label="Ano fabricação" type="number" />
          <Field k="ano_modelo" label="Ano modelo" type="number" />
          <Field k="cor_predominante" label="Cor predominante" />
          <Field k="combustivel" label="Combustível" />
          <Field k="especie_tipo" label="Espécie / Tipo" />
          <Field k="categoria" label="Categoria" />
          <Field k="cat" label="CAT" />
          <Field k="carroceria" label="Carroceria" />
          <Field k="chassi" label="Chassi" />
        </div>

        <div className="text-xs font-semibold uppercase text-muted-foreground">Especificações técnicas</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field k="potencia_cilindrada" label="Potência / Cilindrada" />
          <Field k="peso_bruto_total" label="Peso bruto total" />
          <Field k="cmt" label="CMT" />
          <Field k="capacidade" label="Capacidade" />
          <Field k="eixos" label="Eixos" type="number" />
          <Field k="lotacao" label="Lotação" />
          <Field k="motor" label="Motor" />
        </div>

        <div className="text-xs font-semibold uppercase text-muted-foreground">Proprietário & Emissão</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2"><Field k="proprietario_nome" label="Nome do proprietário" /></div>
          <Field k="proprietario_cpf_cnpj" label="CPF / CNPJ" />
          <Field k="local_emissao" label="Local de emissão" />
          <Field k="data_emissao" label="Data de emissão" type="date" />
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar veículo"}
        </Button>
      </div>
    </DialogContent>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.split(",")[1]);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
