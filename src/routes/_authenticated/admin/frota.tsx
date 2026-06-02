import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, Truck } from "lucide-react";
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
  ano: number | null;
  obra_alocado: string | null;
  vencimento_ipva: string | null;
  vencimento_licenciamento: string | null;
  vencimento_seguro: string | null;
  crlv_url: string | null;
};

function badgeForDate(date: string | null): { label: string; cls: string } {
  if (!date) return { label: "—", cls: "bg-muted text-muted-foreground" };
  const d = new Date(date);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: "🔴 Vencido", cls: "bg-destructive/10 text-destructive border-destructive/30" };
  if (diff < 30) return { label: "🟡 Vence em breve", cls: "bg-warning/15 text-warning-foreground border-warning/40" };
  return { label: "🟢 Regular", cls: "bg-success/10 text-success border-success/30" };
}

function FrotaPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function fetchAll() {
    setLoading(true);
    const { data, error } = await supabase.from("veiculos").select("*").order("placa");
    if (error) toast.error(error.message);
    else setVeiculos((data ?? []) as Veiculo[]);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Frota & Documentos</h1>
          <p className="text-sm text-muted-foreground">Cadastre veículos e acompanhe documentos vencendo.</p>
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
            <Card key={v.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-lg font-bold tracking-wider">{v.placa}</div>
                  <div className="text-sm text-muted-foreground">{v.modelo} {v.ano ?? ""}</div>
                </div>
                <Truck className="h-5 w-5 text-muted-foreground" />
              </div>
              {v.obra_alocado && <div className="text-xs text-muted-foreground">📍 {v.obra_alocado}</div>}
              <div className="space-y-1.5">
                {[
                  { label: "IPVA", date: v.vencimento_ipva },
                  { label: "Licenciamento", date: v.vencimento_licenciamento },
                  { label: "Seguro", date: v.vencimento_seguro },
                ].map((b) => {
                  const bd = badgeForDate(b.date);
                  return (
                    <div key={b.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className={`px-2 py-0.5 rounded border ${bd.cls}`}>{bd.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VeiculoForm({ onSaved }: { onSaved: () => void }) {
  const ocrFn = useServerFn(extrairOCR);
  const [form, setForm] = useState({
    placa: "", modelo: "", ano: "", obra_alocado: "",
    vencimento_ipva: "", vencimento_licenciamento: "", vencimento_seguro: "",
  });
  const [crlvFile, setCrlvFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleScan(file: File) {
    setScanning(true);
    try {
      const b64 = await fileToBase64(file);
      const result = await ocrFn({ data: { imageBase64: b64, mimeType: file.type || "image/jpeg", tipo: "veiculo" } });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("data" in result) {
        const d: any = result.data;
        setForm((f) => ({
          ...f,
          placa: d.placa ?? f.placa,
          modelo: d.modelo ?? f.modelo,
          ano: d.ano ? String(d.ano) : f.ano,
          vencimento_ipva: d.vencimento_ipva ?? f.vencimento_ipva,
          vencimento_licenciamento: d.vencimento_licenciamento ?? f.vencimento_licenciamento,
          vencimento_seguro: d.vencimento_seguro ?? f.vencimento_seguro,
        }));
        toast.success("Dados extraídos! Confira antes de salvar.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setScanning(false);
    }
  }

  async function save() {
    if (!form.placa || !form.modelo) {
      toast.error("Placa e modelo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      let crlv_url: string | null = null;
      if (crlvFile) crlv_url = await uploadFile(crlvFile, "veiculos/crlv");
      const { error } = await supabase.from("veiculos").insert({
        placa: form.placa.toUpperCase(),
        modelo: form.modelo,
        ano: form.ano ? parseInt(form.ano) : null,
        obra_alocado: form.obra_alocado || null,
        vencimento_ipva: form.vencimento_ipva || null,
        vencimento_licenciamento: form.vencimento_licenciamento || null,
        vencimento_seguro: form.vencimento_seguro || null,
        crlv_url,
      });
      if (error) throw error;
      toast.success("Veículo cadastrado");
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Novo veículo</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Escanear CRLV / Multa com IA</span>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Placa *</Label><Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} /></div>
          <div className="space-y-2"><Label>Ano</Label><Input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label>Modelo *</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
        <div className="space-y-2"><Label>Obra alocado</Label><Input value={form.obra_alocado} onChange={(e) => setForm({ ...form, obra_alocado: e.target.value })} /></div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label className="text-xs">Venc. IPVA</Label><Input type="date" value={form.vencimento_ipva} onChange={(e) => setForm({ ...form, vencimento_ipva: e.target.value })} /></div>
          <div className="space-y-2"><Label className="text-xs">Venc. Licenc.</Label><Input type="date" value={form.vencimento_licenciamento} onChange={(e) => setForm({ ...form, vencimento_licenciamento: e.target.value })} /></div>
          <div className="space-y-2"><Label className="text-xs">Venc. Seguro</Label><Input type="date" value={form.vencimento_seguro} onChange={(e) => setForm({ ...form, vencimento_seguro: e.target.value })} /></div>
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
