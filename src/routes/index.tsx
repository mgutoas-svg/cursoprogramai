import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadFiles } from "@/lib/storage";
import { Loader2, Upload, CheckCircle2, Wrench, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abrir Chamado — OperaFlow" },
      { name: "description", content: "Envie sua demanda de manutenção em segundos. Nossa equipe analisa e responde." },
    ],
  }),
  component: PublicForm,
});

type Form = {
  cliente_nome: string;
  local_obra: string;
  descricao: string;
  whatsapp_contato: string;
};

function FileField({
  id, label, hint, files, setFiles, accept,
}: {
  id: string; label: string; hint?: string;
  files: File[]; setFiles: (f: File[]) => void; accept?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : (hint ?? "Toque para enviar")}
        </div>
      </label>
      <input
        id={id}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />
      {files.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {files.map((f, i) => <li key={i}>📎 {f.name}</li>)}
        </ul>
      )}
    </div>
  );
}

function PublicForm() {
  const [form, setForm] = useState<Form>({ cliente_nome: "", local_obra: "", descricao: "", whatsapp_contato: "" });
  const [fotosGerais, setFotosGerais] = useState<File[]>([]);
  const [fotosPeca, setFotosPeca] = useState<File[]>([]);
  const [orcamentos, setOrcamentos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setForm({ cliente_nome: "", local_obra: "", descricao: "" });
    setFotosGerais([]); setFotosPeca([]); setOrcamentos([]);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_nome || !form.local_obra || !form.descricao) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      const [foto_geral_url, foto_peca_url, orcamento_url] = await Promise.all([
        uploadFiles(fotosGerais, "demandas/geral"),
        uploadFiles(fotosPeca, "demandas/peca"),
        uploadFiles(orcamentos, "demandas/orcamento"),
      ]);

      const { error } = await supabase.from("demandas").insert({
        cliente_nome: form.cliente_nome,
        local_obra: form.local_obra,
        descricao: form.descricao,
        foto_geral_url, foto_peca_url, orcamento_url,
      });
      if (error) throw error;

      setSuccess(true);
      reset();
      toast.success("Demanda recebida com sucesso!", {
        description: "Nossa equipe já está analisando.",
      });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar demanda", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-surface)" }}>
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wrench className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">OperaFlow</span>
          </div>
          <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Área Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Abrir chamado de manutenção</h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Descreva o problema e envie fotos. Nossa equipe responde rápido.
          </p>
        </div>

        {success && (
          <Card className="mb-6 p-4 border-success/40 bg-success/5">
            <div className="flex items-center gap-3 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <div className="font-semibold">Demanda recebida com sucesso!</div>
                <div className="text-sm text-muted-foreground">Nossa equipe já está analisando.</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5 md:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">Nome da Empresa *</Label>
              <Input
                id="cliente_nome"
                value={form.cliente_nome}
                onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                placeholder="Ex.: Construtora ABC"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local_obra">Local da Obra *</Label>
              <Input
                id="local_obra"
                value={form.local_obra}
                onChange={(e) => setForm({ ...form, local_obra: e.target.value })}
                placeholder="Endereço ou nome do canteiro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição detalhada da demanda *</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o problema, o equipamento e o que precisa ser feito."
                rows={5}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FileField
                id="fg" label="Fotos gerais do problema"
                hint="JPG/PNG" accept="image/*"
                files={fotosGerais} setFiles={setFotosGerais}
              />
              <FileField
                id="fp" label="Fotos da peça a reparar"
                hint="JPG/PNG" accept="image/*"
                files={fotosPeca} setFiles={setFotosPeca}
              />
              <FileField
                id="orc" label="Orçamentos prévios"
                hint="PDF, JPG, PNG (opcional)" accept="image/*,application/pdf"
                files={orcamentos} setFiles={setOrcamentos}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : "Enviar demanda"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Você receberá um retorno da nossa equipe assim que o chamado for analisado.
        </p>
      </main>
    </div>
  );
}
