import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, Truck, FileText, Pencil, Trash2 } from "lucide-react";
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

function FormField({ label, type = "text", className = "", value, onChange }: { k?: string; label: string; type?: string; className?: string; value: string; onChange: (v: string) => void }) {
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
          <FormField label="Placa *"  value={form.placa} onChange={(v) => setField("placa", v)} />
          <FormField label="RENAVAM"  value={form.renavam} onChange={(v) => setField("renavam", v)} />
          <FormField label="Exercício" type="number"  value={form.exercicio} onChange={(v) => setField("exercicio", v)} />
          <FormField label="Nº do CRV"  value={form.numero_crv} onChange={(v) => setField("numero_crv", v)} />
          <FormField label="Cód. segurança CLA"  value={form.codigo_seguranca_cla} onChange={(v) => setField("codigo_seguranca_cla", v)} />
          <FormField label="Placa anterior"  value={form.placa_anterior} onChange={(v) => setField("placa_anterior", v)} />
        </div>

        <div className="text-xs font-semibold uppercase text-muted-foreground">Veículo</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-3">
            <FormField label="Marca / Modelo / Versão *" value={form.modelo} onChange={(v) => setField("modelo", v)} />
          </div>
          <FormField label="Ano fabricação" type="number"  value={form.ano_fabricacao} onChange={(v) => setField("ano_fabricacao", v)} />
          <FormField label="Ano modelo" type="number"  value={form.ano_modelo} onChange={(v) => setField("ano_modelo", v)} />
          <FormField label="Cor predominante"  value={form.cor_predominante} onChange={(v) => setField("cor_predominante", v)} />
          <FormField label="Combustível"  value={form.combustivel} onChange={(v) => setField("combustivel", v)} />
          <FormField label="Espécie / Tipo" value={form.especie_tipo} onChange={(v) => setField("especie_tipo", v)} />
          <FormField label="Categoria"  value={form.categoria} onChange={(v) => setField("categoria", v)} />
          <FormField label="CAT"  value={form.cat} onChange={(v) => setField("cat", v)} />
          <FormField label="Carroceria"  value={form.carroceria} onChange={(v) => setField("carroceria", v)} />
          <FormField label="Chassi"  value={form.chassi} onChange={(v) => setField("chassi", v)} />
        </div>

        <div className="text-xs font-semibold uppercase text-muted-foreground">Especificações técnicas</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <FormField label="Potência / Cilindrada" value={form.potencia_cilindrada} onChange={(v) => setField("potencia_cilindrada", v)} />
          <FormField label="Peso bruto total"  value={form.peso_bruto_total} onChange={(v) => setField("peso_bruto_total", v)} />
          <FormField label="CMT"  value={form.cmt} onChange={(v) => setField("cmt", v)} />
          <FormField label="Capacidade"  value={form.capacidade} onChange={(v) => setField("capacidade", v)} />
          <FormField label="Eixos" type="number"  value={form.eixos} onChange={(v) => setField("eixos", v)} />
          <FormField label="Lotação"  value={form.lotacao} onChange={(v) => setField("lotacao", v)} />
          <FormField label="Motor"  value={form.motor} onChange={(v) => setField("motor", v)} />
        </div>

        <div className="text-xs font-semibold uppercase text-muted-foreground">Proprietário & Emissão</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2"><FormField label="Nome do proprietário"  value={form.proprietario_nome} onChange={(v) => setField("proprietario_nome", v)} /></div>
          <FormField label="CPF / CNPJ" value={form.proprietario_cpf_cnpj} onChange={(v) => setField("proprietario_cpf_cnpj", v)} />
          <FormField label="Local de emissão"  value={form.local_emissao} onChange={(v) => setField("local_emissao", v)} />
          <FormField label="Data de emissão" type="date"  value={form.data_emissao} onChange={(v) => setField("data_emissao", v)} />
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
