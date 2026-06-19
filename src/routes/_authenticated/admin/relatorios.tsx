import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BarChart3, Truck, DollarSign, Wrench, AlertTriangle, Search, ChevronLeft, ChevronRight, FileDown, Printer, FileText, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Database } from "@/integrations/supabase/types";
import { type CustoComVeiculo } from "./custos";

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

type Manutencao = Database['public']['Tables']['manutencao_preventiva']['Row'];


function RelatoriosPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [custos, setCustos] = useState<CustoComVeiculo[]>([]);
  const [manut, setManut] = useState<Manutencao[]>([]);
  const [selecionado, setSelecionado] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [detalhesPaginados, setDetalhesPaginados] = useState<CustoComVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroManut, setFiltroManut] = useState<string>("todas");
  const [dadosTrend, setDadosTrend] = useState<{ month: string; total: number }[]>([]);
  
  // Estado para listagem detalhada paginada
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Filtros de custo (Base para os cards e agregação)
    // Nota: Para sistemas massivos, aqui usaríamos um RPC de agregação. 
    // Por ora, filtramos no servidor para não baixar o banco todo.
    let queryCustos = supabase.from("custos").select("*, veiculos(placa)");
    if (selecionado !== "todos") queryCustos = queryCustos.eq("veiculo_id", selecionado);
    if (dataInicio) queryCustos = queryCustos.gte("data_gasto", dataInicio);
    if (dataFim) queryCustos = queryCustos.lte("data_gasto", dataFim);

    // Filtros de manutenção
    let queryManut = supabase.from("manutencao_preventiva").select("*");
    if (selecionado !== "todos") queryManut = queryManut.eq("veiculo_id", selecionado);
    if (filtroManut === "pendente") queryManut = queryManut.neq("status_item", "OK");
    if (filtroManut === "ok") queryManut = queryManut.eq("status_item", "OK");

    // Dados para o gráfico de tendência (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const trendStart = sixMonthsAgo.toISOString().split('T')[0];

    let queryTrend = supabase.from("custos").select("valor, data_gasto");
    if (selecionado !== "todos") queryTrend = queryTrend.eq("veiculo_id", selecionado);
    queryTrend = queryTrend.gte("data_gasto", trendStart);

    // Query específica para a listagem detalhada (com busca e paginação)
    let queryDetalhes = supabase.from("custos").select("*, veiculos(placa)", { count: "exact" });
    if (selecionado !== "todos") queryDetalhes = queryDetalhes.eq("veiculo_id", selecionado);
    if (dataInicio) queryDetalhes = queryDetalhes.gte("data_gasto", dataInicio);
    if (dataFim) queryDetalhes = queryDetalhes.lte("data_gasto", dataFim);
    if (search) queryDetalhes = queryDetalhes.ilike("descricao", `%${search}%`);

    const [v, c, m, det, trend] = await Promise.all([
      supabase.from("veiculos").select("*").order("placa"),
      queryCustos,
      queryManut,
      queryDetalhes.order("data_gasto", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
      queryTrend
    ]);

    if (v.error) toast.error(v.error.message); 
    else setVeiculos((v.data ?? []) as Veiculo[]);
    
    if (c.error) toast.error(c.error.message); 
    else setCustos((c.data ?? []) as CustoComVeiculo[]);
    
    if (m.error) toast.error(m.error.message); 
    else setManut((m.data ?? []) as Manutencao[]);

    if (det.error) toast.error(det.error.message); else {
      // Note: Usamos os custos da query paginada apenas para exibição na tabela detalhada
      // A agregação continua usando a query c.data que reflete os filtros de data/veículo.
      setDetalhesPaginados((det.data ?? []) as CustoComVeiculo[]);
      setTotalRecords(det.count ?? 0);
    }

    if (trend.error) {
      console.error("Erro ao carregar dados do gráfico", trend.error);
    } else {
      const now = new Date();
      const last6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = d.toISOString().slice(0, 7);
        const label = d.toLocaleString("pt-BR", { month: "short" }).toUpperCase();
        last6.push({ key: k, month: label, total: 0 });
      }
      
      (trend.data ?? []).forEach(item => {
        if (!item.data_gasto) return;
        const k = item.data_gasto.slice(0, 7);
        const match = last6.find(m => m.key === k);
        if (match) match.total += Number(item.valor) || 0;
      });
      
      setDadosTrend(last6.map(({ month, total }) => ({ month, total })));
    }

    setLoading(false);
  }, [selecionado, dataInicio, dataFim, page, search, filtroManut]);

  const exportToExcel = () => {
    if (!custos || custos.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }

    const headers = ["Data", "Veículo", "Categoria", "Descrição", "Prestador", "Valor (R$)"];
    const rows = custos.map(c => [
      c.data_gasto ? new Date(c.data_gasto).toLocaleDateString("pt-BR") : "",
      c.veiculos?.placa ?? "—",
      c.categoria,
      c.descricao,
      c.prestador_oficina || "—",
      (Number(c.valor) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    ]);

    const csvContent = "\ufeff" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operaflow_relatorio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Relatório exportado para Excel (CSV).");
  };

  useEffect(() => {
    const h = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(h);
  }, [fetchData]);


  // Agregação por veículo
  const porVeiculo = useMemo(() => {
    const map = new Map<string, { veiculo: Veiculo; total: number; porCategoria: Record<string, number>; qtdLancamentos: number; manutFiltrada: number }>();
    veiculos.forEach((v) => {
      map.set(v.id, { veiculo: v, total: 0, porCategoria: {}, qtdLancamentos: 0, manutFiltrada: 0 });
    });
    custos.forEach((c) => {
      if (!c.veiculo_id) return;
      const entry = map.get(c.veiculo_id);
      if (!entry) return;
      const v = Number(c.valor) || 0;
      entry.total += v;
      entry.porCategoria[c.categoria] = (entry.porCategoria[c.categoria] ?? 0) + v;
      entry.qtdLancamentos += 1;
    });
    manut.forEach((m) => {
      const isPendencia = m.status_item && m.status_item !== "OK";
      const shouldCount = filtroManut === "todas" ? isPendencia : true;
      const e = map.get(m.veiculo_id);
      if (e && m.veiculo_id && shouldCount) e.manutFiltrada += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [veiculos, custos, manut, filtroManut]);

  const semVeiculo = useMemo(() => custos.filter((c) => !c.veiculo_id).reduce((s, c) => s + Number(c.valor), 0), [custos]);
  const totalGeral = useMemo(() => custos.reduce((s, c) => s + Number(c.valor), 0), [custos]);
  const maxTotal = useMemo(() => porVeiculo.length > 0 ? Math.max(1, ...porVeiculo.map((p) => p.total)) : 1, [porVeiculo]);

  const lista = selecionado === "todos" ? porVeiculo : porVeiculo.filter((p) => p.veiculo.id === selecionado);

  return (
    <div className="p-4 md:p-8 space-y-6 print:p-8 print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-no-break { break-inside: avoid; }
        }
      `}} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Relatório por Veículo
          </h1>
          <p className="text-sm text-muted-foreground">Custos, manutenções e indicadores agregados por veículo da frota.</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading}>
            <FileDown className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={loading}>
            <Printer className="h-4 w-4 mr-2" /> PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Cabeçalho exclusivo para Impressão/PDF */}
      <div className="hidden print:block border-b-2 pb-4 mb-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold">Relatório Consolidado de Frota — OperaFlow</h2>
            <p className="text-xs text-muted-foreground">Extraído em {new Date().toLocaleString("pt-BR")}</p>
          </div>
          <div className="text-right text-xs">
            <div><strong>Período:</strong> {dataInicio ? new Date(dataInicio).toLocaleDateString("pt-BR") : "Início"} - {dataFim ? new Date(dataFim).toLocaleDateString("pt-BR") : "Fim"}</div>
            <div><strong>Filtro Veículo:</strong> {selecionado === "todos" ? "Todos" : veiculos.find(v => v.id === selecionado)?.placa}</div>
            <div><strong>Status Manut.:</strong> {filtroManut === "todas" ? "Todos" : filtroManut === "pendente" ? "Pendentes" : "Em dia"}</div>
          </div>
        </div>
      </div>

      <Card className="p-4 print:hidden">
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
          <div className="space-y-1.5">
            <Label className="text-xs">Status Manutenção</Label>
            <Select value={filtroManut} onValueChange={setFiltroManut}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os itens</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="ok">Em dia (OK)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSelecionado("todos"); setDataInicio(""); setDataFim(""); setFiltroManut("todas"); }}
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
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Wrench className="h-3 w-3" /> 
            {filtroManut === "ok" ? "Itens em dia" : "Itens com pendência"}
          </div>
          <div className="text-2xl font-bold mt-1">
            {filtroManut === "todas" ? manut.filter((m) => m.status_item && m.status_item !== "OK").length : manut.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Custos sem veículo</div>
          <div className="text-lg font-bold mt-1">R$ {semVeiculo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </Card>
      </div>

      <Card className="p-6 print-no-break">
        <h3 className="font-semibold mb-6 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Tendência de Gastos (Últimos 6 Meses)
        </h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(val: number) => val >= 1000 ? `R$ ${(val/1000).toFixed(1)}k` : `R$ ${val}`}
              />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Total Mensal"]}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="var(--primary)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "hsl(var(--background))" }} 
                activeDot={{ r: 6, strokeWidth: 0 }} 
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando relatório...</Card>
      ) : lista.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-3" />
          Nenhum veículo encontrado para os filtros selecionados.
        </Card>
      ) : (
        <div className="space-y-4">
          {lista.map(({ veiculo, total, porCategoria, qtdLancamentos, manutFiltrada }) => {
            const barPct = Math.round((total / maxTotal) * 100);
            const custoMedio = qtdLancamentos > 0 ? total / qtdLancamentos : 0;
            return (
              <Card key={veiculo.id} className="p-5 print-no-break">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{veiculo.placa}</span>
                      <span className="font-semibold">{veiculo.modelo}</span>
                      {veiculo.ano_modelo && <span className="text-xs text-muted-foreground">({veiculo.ano_modelo})</span>}
                    </div>
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
                    <div className="text-xs text-muted-foreground">
                      {filtroManut === "ok" ? "Manutenção em dia" : "Manutenção pendente"}
                    </div>
                    <div className={`text-lg font-semibold ${filtroManut !== "ok" && manutFiltrada > 0 ? "text-destructive" : ""}`}>{manutFiltrada}</div>
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

              </Card>
            );
          })}

          <Card className="p-0 overflow-hidden print-no-break">
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" /> Detalhamento dos Lançamentos
              </h2>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar na descrição..." 
                  className="pl-8 h-9" 
                  value={search} 
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Veículo</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detalhesPaginados.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum custo detalhado encontrado.</td></tr>
                  ) : (
                    detalhesPaginados.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="p-3 whitespace-nowrap">{c.data_gasto ? new Date(c.data_gasto).toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="p-3 font-mono">{c.veiculos?.placa || "—"}</td>
                        <td className="p-3 truncate max-w-[200px]">{c.descricao}</td>
                        <td className="p-3 text-right font-semibold">R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border flex items-center justify-between bg-muted/10">
              <span className="text-[10px] text-muted-foreground">Total de {totalRecords} registros</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs">Pág {page + 1}</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalRecords}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
