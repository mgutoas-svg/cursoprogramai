import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Wrench, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/manutencao")({
  head: () => ({ meta: [{ title: "Manutenção Preventiva — OperaFlow" }] }),
  component: ManutencaoPage,
});

type Item = {
  id: string;
  veiculo_id: string;
  item: string;
  km_ultima_troca: number | null;
  km_atual: number | null;
  km_proxima_troca: number | null;
  data_proxima_revisao: string | null;
  status_item: string | null;
  veiculos?: { placa: string; modelo: string } | null;
};
type Veiculo = { id: string; placa: string; modelo: string };

function computeStatus(it: Item): { label: string; cls: string } {
  const now = new Date();
  if (it.data_proxima_revisao) {
    const d = new Date(it.data_proxima_revisao);
    if (d < now) return { label: "🔴 Vencido", cls: "bg-destructive/10 text-destructive border-destructive/30" };
    if ((d.getTime() - now.getTime()) / 86400000 < 15) return { label: "🟡 Agendar", cls: "bg-warning/15 text-warning-foreground border-warning/40" };
  }
  if (it.km_atual != null && it.km_proxima_troca != null) {
    const restante = it.km_proxima_troca - it.km_atual;
    if (restante <= 0) return { label: "🔴 Vencido (km)", cls: "bg-destructive/10 text-destructive border-destructive/30" };
    if (restante < 1000) return { label: "🟡 Agendar (km)", cls: "bg-warning/15 text-warning-foreground border-warning/40" };
  }
  return { label: "🟢 OK", cls: "bg-success/10 text-success border-success/30" };
}

function ManutencaoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    const [i, v] = await Promise.all([
      supabase.from("manutencao_preventiva").select("*, veiculos(placa, modelo)").order("data_proxima_revisao"),
      supabase.from("veiculos").select("id, placa, modelo").order("placa"),
    ]);
    if (i.error) toast.error(i.error.message); else setItems((i.data ?? []) as Item[]);
    if (!v.error) setVeiculos((v.data ?? []) as Veiculo[]);
    setLoading(false);
  }
  useEffect(() => { fetchAll(); }, []);

  async function handleDelete(it: Item) {
    if (!confirm(`Excluir item "${it.item}"?`)) return;
    const { error } = await supabase.from("manutencao_preventiva").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success("Item excluído");
    fetchAll();
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manutenção Preventiva</h1>
          <p className="text-sm text-muted-foreground">Cronograma de revisões e trocas por veículo.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo item</Button>
          </DialogTrigger>
          <ItemForm veiculos={veiculos} onSaved={() => { setOpen(false); fetchAll(); }} />
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum item de manutenção cadastrado.</p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {items.map((it) => {
              const s = computeStatus(it);
              return (
                <li key={it.id} className="p-4 flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold">{it.item}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.veiculos?.placa} · {it.veiculos?.modelo}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {it.km_atual != null && it.km_proxima_troca != null && (
                        <span>KM atual {it.km_atual.toLocaleString()} / próxima {it.km_proxima_troca.toLocaleString()}</span>
                      )}
                      {it.data_proxima_revisao && <span className="ml-2">📅 {new Date(it.data_proxima_revisao).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs border rounded px-2 py-1 ${s.cls}`}>{s.label}</span>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(it)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(it)} aria-label="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <ItemForm
            veiculos={veiculos}
            initial={editing}
            onSaved={() => { setEditing(null); fetchAll(); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function ItemForm({ veiculos, onSaved, initial }: { veiculos: Veiculo[]; onSaved: () => void; initial?: Item }) {
  const toStr = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const [form, setForm] = useState({
    veiculo_id: initial?.veiculo_id ?? "",
    item: initial?.item ?? "",
    km_ultima_troca: toStr(initial?.km_ultima_troca),
    km_atual: toStr(initial?.km_atual),
    km_proxima_troca: toStr(initial?.km_proxima_troca),
    data_proxima_revisao: initial?.data_proxima_revisao ?? "",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function save() {
    if (!form.veiculo_id || !form.item) {
      toast.error("Veículo e item são obrigatórios.");
      return;
    }
    setSaving(true);
    const payload = {
      veiculo_id: form.veiculo_id,
      item: form.item,
      km_ultima_troca: form.km_ultima_troca ? parseInt(form.km_ultima_troca) : null,
      km_atual: form.km_atual ? parseInt(form.km_atual) : null,
      km_proxima_troca: form.km_proxima_troca ? parseInt(form.km_proxima_troca) : null,
      data_proxima_revisao: form.data_proxima_revisao || null,
    };
    const { error } = isEdit && initial
      ? await supabase.from("manutencao_preventiva").update(payload).eq("id", initial.id)
      : await supabase.from("manutencao_preventiva").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Item atualizado" : "Item cadastrado");
    onSaved();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{isEdit ? "Editar item de manutenção" : "Novo item de manutenção"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Veículo</Label>
          <Select value={form.veiculo_id} onValueChange={(v) => setForm({ ...form, veiculo_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Item</Label><Input placeholder="Ex.: Troca de óleo" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2"><Label className="text-xs">KM última</Label><Input type="number" value={form.km_ultima_troca} onChange={(e) => setForm({ ...form, km_ultima_troca: e.target.value })} /></div>
          <div className="space-y-2"><Label className="text-xs">KM atual</Label><Input type="number" value={form.km_atual} onChange={(e) => setForm({ ...form, km_atual: e.target.value })} /></div>
          <div className="space-y-2"><Label className="text-xs">KM próxima</Label><Input type="number" value={form.km_proxima_troca} onChange={(e) => setForm({ ...form, km_proxima_troca: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label>Data próxima revisão</Label><Input type="date" value={form.data_proxima_revisao} onChange={(e) => setForm({ ...form, data_proxima_revisao: e.target.value })} /></div>
        <Button onClick={save} disabled={saving} className="w-full">{saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar"}</Button>
      </div>
    </DialogContent>
  );
}
