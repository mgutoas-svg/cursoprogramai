import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, DollarSign, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { uploadFile } from "@/lib/storage";
import { useServerFn } from "@tanstack/react-start";
import { extrairOCR, type OCRResultNota } from "@/lib/ocr.functions";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/custos")({
  head: () => ({ meta: [{ title: "Custos — OperaFlow" }] }),
  component: CustosPage,
});

const CATEGORIAS = ["Combustível", "Manutenção Corretiva", "Manutenção Preventiva", "Imposto/Multa", "Seguro"];

export type CustoComVeiculo = Database['public']['Tables']['custos']['Row'] & {
  veiculos?: { placa: string } | null;
};

type Veiculo = { id: string; placa: string; modelo: string };

function CustosPage() {
  const [custos, setCustos] = useState<CustoComVeiculo[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 15;

  const fetchAll = useCallback(async () => {
    const [c, v] = await Promise.all([
      supabase
        .from("custos")
        .select("*, veiculos(placa)", { count: "exact" })
        .ilike("descricao", `%${search}%`)
        .order("data_gasto", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
      supabase.from("veiculos").select("id, placa, modelo").order("placa"),
    ]);
    if (c.error) {
      toast.error(c.error.message);
    } else {
      setCustos((c.data ?? []) as CustoComVeiculo[]);
      setTotalCount(c.count ?? 0);
    }
    if (!v.error) setVeiculos((v.data ?? []) as Veiculo[]);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    const handler = setTimeout(() => fetchAll(), 300);
    return () => clearTimeout(handler);
  }, [fetchAll]);

  const totalGeralVisivel = useMemo(() => custos.reduce((s, c) => s + Number(c.valor), 0), [custos]);
  const totalsByCat = useMemo(() => {
    const out: Record<string, number> = {};
    custos.forEach((c) => { out[c.categoria] = (out[c.categoria] ?? 0) + Number(c.valor); });
    return out;
  }, [custos]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Custos & Fluxo Financeiro</h1>
          <p className="text-sm text-muted-foreground">Lançamentos manuais e automáticos de gastos da operação.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              className="pl-8"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo lançamento</Button>
          </DialogTrigger>
          <CustoForm veiculos={veiculos} onSaved={() => { setOpen(false); fetchAll(); }} />
        </Dialog>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4 col-span-2 md:col-span-1" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
          <div className="text-xs opacity-80">Total nesta página</div>
          <div className="text-2xl font-bold mt-1">R$ {totalGeralVisivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </Card>
        {CATEGORIAS.slice(0, 3).map((cat) => (
          <Card key={cat} className="p-4">
            <div className="text-xs text-muted-foreground">{cat}</div>
            <div className="text-lg font-bold mt-1">R$ {(totalsByCat[cat] ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          </Card>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : custos.length === 0 ? (
          <div className="p-10 text-center">
            <DollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum lançamento ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-left p-3">Placa</th>
                  <th className="text-left p-3">Prestador</th>
                  <th className="text-right p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {custos.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap">{new Date(c.data_gasto).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3"><span className="text-xs bg-accent text-accent-foreground rounded px-2 py-0.5">{c.categoria}</span></td>
                    <td className="p-3 max-w-xs truncate">{c.descricao}</td>
                    <td className="p-3 font-mono text-xs">{c.veiculos?.placa ?? "—"}</td>
                    <td className="p-3 text-xs">{c.prestador_oficina ?? "—"}</td>
                    <td className="p-3 text-right font-semibold">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-border flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Mostrando {custos.length} de {totalCount} lançamentos
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium">Página {page + 1}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalCount}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CustoForm({ veiculos, onSaved }: { veiculos: Veiculo[]; onSaved: () => void }) {
  const ocrFn = useServerFn(extrairOCR);
  const [form, setForm] = useState({
    data_gasto: new Date().toISOString().slice(0, 10),
    categoria: "Manutenção Corretiva",
    descricao: "",
    valor: "",
    prestador_oficina: "",
    veiculo_id: "",
  });
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleScan(file: File) {
    setScanning(true);
    try {
      const b64 = await fileToBase64(file);
      const result = await ocrFn({ data: { imageBase64: b64, mimeType: file.type || "image/jpeg", tipo: "nota" } });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if ("data" in result) {
        const d = result.data as OCRResultNota;
        
        const matched = d.placa ? veiculos.find((v) => v.placa.toUpperCase() === String(d.placa).toUpperCase()) : null;
        setForm((f) => ({
          ...f,
          data_gasto: d.data_gasto ?? f.data_gasto,
          prestador_oficina: d.prestador_oficina ?? f.prestador_oficina,
          valor: d.valor ? String(d.valor) : f.valor,
          descricao: d.descricao ?? f.descricao,
          veiculo_id: matched?.id ?? f.veiculo_id,
        }));
        toast.success("Dados extraídos! Confira antes de confirmar.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar imagem");
    } finally {
      setScanning(false);
    }
  }

  async function save() {
    if (!form.descricao || !form.valor) {
      toast.error("Descrição e valor são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      let comprovante_url: string | null = null;
      if (comprovante) comprovante_url = await uploadFile(comprovante, "custos/comprovantes");
      const { error } = await supabase.from("custos").insert({
        data_gasto: form.data_gasto,
        categoria: form.categoria,
        descricao: form.descricao,
        valor: parseFloat(form.valor),
        prestador_oficina: form.prestador_oficina || null,
        veiculo_id: form.veiculo_id || null,
        comprovante_url,
      });
      if (error) throw error;
      toast.success("Custo lançado");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar lançamento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Novo lançamento de custo</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Escanear nota fiscal / recibo com IA</span>
          </div>
          <Input
            type="file"
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) { setComprovante(f); await handleScan(f); }
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
          <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data_gasto} onChange={(e) => setForm({ ...form, data_gasto: e.target.value })} /></div>
          <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div className="space-y-2"><Label>Prestador / Oficina</Label><Input value={form.prestador_oficina} onChange={(e) => setForm({ ...form, prestador_oficina: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>Veículo (opcional)</Label>
          <Select value={form.veiculo_id} onValueChange={(v) => setForm({ ...form, veiculo_id: v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={saving} className="w-full">{saving ? "Lançando..." : "Confirmar lançamento de custo"}</Button>
      </div>
    </DialogContent>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = r.result as string; resolve(s.split(",")[1]); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
