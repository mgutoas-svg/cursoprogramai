import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BarChart3, Truck, DollarSign, Wrench, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios por Veículo — OperaFlow" }] }),
  component: RelatoriosPage,
});

type Veiculo = {
  id: string;
  placa: string;
  modelo: string;
  ano_modelo: number | null;
};
type Custo = { id: string; valor: number; categoria: string; descricao: string; data_gasto: string; veiculo_id: string | null };
type Manutencao = { id: string; veiculo_id: string; item: string; status_item: string | null; data_proxima_revisao: string | null };

function RelatoriosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [manut, setManut] = useState<Manutencao[]>([]);
  const [selecionado, setSelecionado] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [v, c, m] = await Promise.all([
        supabase.from("veiculos").select("*").order("placa"),
        supabase.from("custos").select("id, valor, categoria, descricao, data_gasto, veiculo_id"),
        supabase.from("manutencao_preventiva").select("id, veiculo_id, item, status_item, data_proxima_revisao"),
      ]);
      if (v.error) toast.error(v.error.message); else setVeiculos((v.data ?? []) as Veiculo[]);
      if (c.error) toast.error(c.error.message); else setCustos((c.data ?? []) as Custo[]);
      if (m.error) toast.error(m.error.message); else setManut((m.data ?? []) as Manutencao[]);
      setLoading(false);
    })();
  }, []);

  const custosFiltrados = useMemo(() => {
    return custos.filter((c) => {
      if (selecionado !== "todos" && c.veiculo_id !== selecionado) return false;
      if (dataInicio && c.data_gasto < dataInicio) return false;
      if (dataFim && c.data_gasto > dataFim) return false;
      return true;
    });
  }, [custos, selecionado, dataInicio, dataFim]);

  // Agregação por veículo
  const porVeiculo = useMemo(() => {
    const map = new Map<string, { veiculo: Veiculo; total: number; porCategoria: Record<string, number>; qtdLancamentos: number; manutPendentes: number }>();
    veiculos.forEach((v) => {
      map.set(v.id, { veiculo: v, total: 0, porCategoria: {}, qtdLancamentos: 0, manutPendentes: 0 });
    });
    custosFiltrados.forEach((c) => {
      if (!c.veiculo_id) return;
      const entry = map.get(c.veiculo_id);
      if (!entry) return;
      const v = Number(c.valor);
      entry.total += v;
      entry.porCategoria[c.categoria] = (entry.porCategoria[c.categoria] ?? 0) + v;
      entry.qtdLancamentos += 1;
    });
    manut.forEach((m) => {
      if (m.status_item && m.status_item !== "OK") {
        const e = map.get(m.veiculo_id);
        if (e) e.manutPendentes += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [veiculos, custosFiltrados, manut]);

  const semVeiculo = useMemo(() => custosFiltrados.filter((c) => !c.veiculo_id).reduce((s, c) => s + Number(c.valor), 0), [custosFiltrados]);
  const totalGeral = useMemo(() => custosFiltrados.reduce((s, c) => s + Number(c.valor), 0), [custosFiltrados]);
  const maxTotal = useMemo(() => Math.max(1, ...porVeiculo.map((p) => p.total)), [porVeiculo]);

  const lista = selecionado === "todos" ? porVeiculo : porVeiculo.filter((p) => p.veiculo.id === selecionado);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" /> Relatório por Veículo
        </h1>
        <p className="text-sm text-muted-foreground">Custos, manutenções e indicadores agregados por veículo da frota.</p>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Veículo</Label>
            <Select value={selecionado} onValueChange={setSelecionado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os veículos</SelectItem>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.placa} — {v.modelo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSelecionado("todos"); setDataInicio(""); setDataFim(""); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >Limpar filtros</button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4 col-span-2 md:col-span-1" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
          <div className="text-xs opacity-80 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Total no período</div>
          <div className="text-2xl font-bold mt-1">R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Veículos na frota</div>
          <div className="text-2xl font-bold mt-1">{veiculos.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" /> Itens com pendência</div>
          <div className="text-2xl font-bold mt-1">{manut.filter((m) => m.status_item && m.status_item !== "OK").length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Custos sem veículo</div>
          <div className="text-lg font-bold mt-1">R$ {semVeiculo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </Card>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando relatório...</Card>
      ) : lista.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-3" />
          Nenhum veículo encontrado para os filtros selecionados.
        </Card>
      ) : (
        <div className="space-y-4">
          {lista.map(({ veiculo, total, porCategoria, qtdLancamentos, manutPendentes }) => {
            const barPct = Math.round((total / maxTotal) * 100);
            const custoMedio = qtdLancamentos > 0 ? total / qtdLancamentos : 0;
            return (
              <Card key={veiculo.id} className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{veiculo.placa}</span>
                      <span className="font-semibold">{veiculo.modelo}</span>
                      {veiculo.ano && <span className="text-xs text-muted-foreground">({veiculo.ano})</span>}
                    </div>
                    {veiculo.obra_alocado && (
                      <div className="text-xs text-muted-foreground mt-1">Obra: {veiculo.obra_alocado}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total no período</div>
                    <div className="text-2xl font-bold">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full bg-muted rounded overflow-hidden">
                  <div className="h-full rounded transition-all" style={{ width: `${barPct}%`, background: "var(--gradient-primary)" }} />
                </div>

                <div className="grid gap-3 md:grid-cols-3 mt-4">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Lançamentos</div>
                    <div className="text-lg font-semibold">{qtdLancamentos}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Custo médio / lançamento</div>
                    <div className="text-lg font-semibold">R$ {custoMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Manutenção pendente</div>
                    <div className={`text-lg font-semibold ${manutPendentes > 0 ? "text-destructive" : ""}`}>{manutPendentes}</div>
                  </div>
                </div>

                {Object.keys(porCategoria).length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Por categoria</div>
                    <div className="space-y-1.5">
                      {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span>{cat}</span>
                              <span className="text-muted-foreground">R$ {val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded overflow-hidden">
                              <div className="h-full bg-primary rounded" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(veiculo.vencimento_ipva || veiculo.vencimento_seguro || veiculo.vencimento_licenciamento) && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <Venc label="IPVA" data={veiculo.vencimento_ipva} />
                    <Venc label="Seguro" data={veiculo.vencimento_seguro} />
                    <Venc label="Licenc." data={veiculo.vencimento_licenciamento} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Venc({ label, data }: { label: string; data: string | null }) {
  if (!data) return <div className="rounded border border-border p-2 text-muted-foreground">{label}: —</div>;
  const d = new Date(data);
  const hoje = new Date();
  const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const cor = diff < 0 ? "text-destructive" : diff < 30 ? "text-yellow-600 dark:text-yellow-500" : "text-foreground";
  return (
    <div className="rounded border border-border p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-semibold ${cor}`}>{d.toLocaleDateString("pt-BR")}</div>
    </div>
  );
}
