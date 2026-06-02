import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { getSignedUrls } from "@/lib/storage";
import { AlertCircle, Clock, PlayCircle, CheckCircle2, FileText, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/chamados")({
  head: () => ({ meta: [{ title: "Chamados — OperaFlow" }] }),
  component: ChamadosPage,
});

type Demanda = {
  id: string;
  created_at: string;
  cliente_nome: string;
  local_obra: string;
  descricao: string;
  foto_geral_url: string[] | null;
  foto_peca_url: string[] | null;
  orcamento_url: string[] | null;
  status: string;
  urgencia: string;
  prestador_oficina: string | null;
  valor_reparo: number | null;
  prazo_resolucao: string | null;
  notas_pesquisa: string | null;
  whatsapp_contato: string | null;
};

const STATUS = ["Pendente", "Em Análise", "Em Execução", "Aguardando Pagamento", "Concluído"];
const URGENCIA = ["Crítico", "Médio", "Baixo"];

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "Concluído") return "default";
  if (s === "Pendente") return "destructive";
  return "secondary";
}
function urgenciaColor(u: string) {
  if (u === "Crítico") return "bg-destructive/10 text-destructive border-destructive/30";
  if (u === "Médio") return "bg-warning/10 text-warning-foreground border-warning/40";
  return "bg-success/10 text-success border-success/30";
}

function ChamadosPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Demanda | null>(null);

  async function fetchAll() {
    const { data, error } = await supabase
      .from("demandas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setDemandas((data ?? []) as Demanda[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("demandas-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "demandas" }, (payload) => {
        if (payload.eventType === "INSERT") {
          toast.warning("⚠️ Nova demanda recebida!", {
            description: (payload.new as Demanda).cliente_nome,
          });
        }
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Pendente: 0, "Em Análise": 0, "Em Execução": 0, Concluído: 0 };
    demandas.forEach((d) => { if (d.status in c) c[d.status]++; });
    return c;
  }, [demandas]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Chamados em tempo real</h1>
        <p className="text-sm text-muted-foreground">Acompanhe e trate todas as demandas recebidas dos clientes.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pendentes", value: counts.Pendente, icon: AlertCircle, color: "text-destructive" },
          { label: "Em Análise", value: counts["Em Análise"], icon: Clock, color: "text-warning-foreground" },
          { label: "Em Execução", value: counts["Em Execução"], icon: PlayCircle, color: "text-primary" },
          { label: "Concluídos", value: counts.Concluído, icon: CheckCircle2, color: "text-success" },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-bold">{c.value}</div>
              </div>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : demandas.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma demanda ainda.</div>
        ) : (
          <ul className="divide-y divide-border">
            {demandas.map((d) => (
              <li
                key={d.id}
                onClick={() => setSelected(d)}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{d.cliente_nome}</span>
                      <Badge variant={statusVariant(d.status)} className="text-[10px]">{d.status}</Badge>
                      <span className={`text-[10px] border rounded px-1.5 py-0.5 ${urgenciaColor(d.urgencia)}`}>{d.urgencia}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.local_obra}{d.whatsapp_contato ? ` · 📱 ${d.whatsapp_contato}` : ""}</div>
                    <div className="text-sm mt-1 line-clamp-2 text-foreground/80">{d.descricao}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(d.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <DetailSheet demanda={selected} onClose={() => setSelected(null)} onSaved={fetchAll} />
    </div>
  );
}

function DetailSheet({ demanda, onClose, onSaved }: { demanda: Demanda | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Demanda>>({});
  const [saving, setSaving] = useState(false);
  const [fotoGeralUrls, setFotoGeralUrls] = useState<string[]>([]);
  const [fotoPecaUrls, setFotoPecaUrls] = useState<string[]>([]);
  const [orcamentoUrls, setOrcamentoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!demanda) return;
    setForm({
      status: demanda.status,
      urgencia: demanda.urgencia,
      prestador_oficina: demanda.prestador_oficina ?? "",
      valor_reparo: demanda.valor_reparo ?? null,
      prazo_resolucao: demanda.prazo_resolucao ?? "",
      notas_pesquisa: demanda.notas_pesquisa ?? "",
      whatsapp_contato: demanda.whatsapp_contato ?? "",
    });
    (async () => {
      setFotoGeralUrls(await getSignedUrls(demanda.foto_geral_url ?? []));
      setFotoPecaUrls(await getSignedUrls(demanda.foto_peca_url ?? []));
      setOrcamentoUrls(await getSignedUrls(demanda.orcamento_url ?? []));
    })();
  }, [demanda]);

  async function save() {
    if (!demanda) return;
    setSaving(true);
    const { error } = await supabase
      .from("demandas")
      .update({
        status: form.status,
        urgencia: form.urgencia,
        prestador_oficina: form.prestador_oficina || null,
        valor_reparo: form.valor_reparo || null,
        prazo_resolucao: form.prazo_resolucao || null,
        notas_pesquisa: form.notas_pesquisa || null,
      })
      .eq("id", demanda.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Demanda atualizada");
    if (form.status === "Concluído" && form.valor_reparo) {
      toast.info("Custo lançado automaticamente na aba Custos.");
    }
    onSaved();
    onClose();
  }

  return (
    <Sheet open={!!demanda} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes da demanda</SheetTitle>
        </SheetHeader>
        {demanda && (
          <div className="space-y-5 mt-4 p-4">
            <Card className="p-4 bg-muted/30">
              <div className="font-semibold">{demanda.cliente_nome}</div>
              <div className="text-xs text-muted-foreground">{demanda.local_obra}</div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{demanda.descricao}</p>
            </Card>

            <MediaGrid title="Fotos gerais" urls={fotoGeralUrls} kind="image" />
            <MediaGrid title="Fotos da peça" urls={fotoPecaUrls} kind="image" />
            <MediaGrid title="Orçamentos prévios" urls={orcamentoUrls} kind="file" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgência</Label>
                <Select value={form.urgencia} onValueChange={(v) => setForm({ ...form, urgencia: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{URGENCIA.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prestador / Oficina</Label>
              <Input value={form.prestador_oficina ?? ""} onChange={(e) => setForm({ ...form, prestador_oficina: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor do reparo (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_reparo ?? ""} onChange={(e) => setForm({ ...form, valor_reparo: e.target.value ? parseFloat(e.target.value) : null })} />
              </div>
              <div className="space-y-2">
                <Label>Prazo de resolução</Label>
                <Input type="date" value={form.prazo_resolucao ?? ""} onChange={(e) => setForm({ ...form, prazo_resolucao: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas de pesquisa</Label>
              <Textarea rows={3} value={form.notas_pesquisa ?? ""} onChange={(e) => setForm({ ...form, notas_pesquisa: e.target.value })} />
            </div>

            <Button onClick={save} disabled={saving} className="w-full h-11">
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MediaGrid({ title, urls, kind }: { title: string; urls: string[]; kind: "image" | "file" }) {
  if (!urls.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</div>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((u, i) =>
          kind === "image" ? (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden bg-muted block">
              <img src={u} alt="" className="h-full w-full object-cover" />
            </a>
          ) : (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center aspect-square rounded-lg bg-muted hover:bg-muted/70 text-center p-2">
              <FileText className="h-6 w-6 mb-1" />
              <span className="text-[10px] text-muted-foreground">Abrir</span>
            </a>
          )
        )}
      </div>
    </div>
  );
}
