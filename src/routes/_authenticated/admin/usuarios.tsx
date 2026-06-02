import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, Shield } from "lucide-react";
import { listAdminUsers, createAdminUser, deleteAdminUser } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — OperaFlow" }] }),
  component: UsuariosPage,
});

type AdminUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null };

function UsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listAdminUsers();
      setUsers(data);
    } catch (e: any) {
      toast.error("Erro ao carregar usuários", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createAdminUser({ data: { email, password } });
      toast.success("Administrador criado");
      setEmail("");
      setPassword("");
      load();
    } catch (err: any) {
      toast.error("Falha ao criar", { description: err.message });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, em: string) {
    if (!confirm(`Excluir o administrador ${em}?`)) return;
    try {
      await deleteAdminUser({ data: { userId: id } });
      toast.success("Administrador removido");
      load();
    } catch (err: any) {
      toast.error("Falha ao excluir", { description: err.message });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Usuários
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Apenas administradores podem criar ou remover contas de acesso ao painel.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Novo administrador
        </h2>
        <form onSubmit={handleCreate} className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1.5 md:col-span-1">
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <Label>Senha</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="md:col-span-1 flex items-end">
            <Button type="submit" className="w-full h-10" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Administradores ativos</h2>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum administrador.</p>
        ) : (
          <ul className="divide-y">
            {users.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Criado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    {u.last_sign_in_at && <> · Último acesso: {new Date(u.last_sign_in_at).toLocaleString("pt-BR")}</>}
                    {u.id === meId && <> · <span className="text-primary">você</span></>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(u.id, u.email)}
                  disabled={u.id === meId}
                  title={u.id === meId ? "Não é possível excluir a própria conta" : "Excluir"}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
