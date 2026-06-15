import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Wrench, Loader2, Info } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acesso Administrativo — OperaFlow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrap] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin/chamados", replace: true });
    });
  }, [navigate]);
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error("Falha no login", { description: error.message });
    toast.success("Bem-vindo!");
    navigate({ to: "/admin/chamados", replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-surface)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center text-primary-foreground"
               style={{ background: "var(--gradient-primary)" }}>
            <Wrench className="h-4 w-4" />
          </div>
          <span className="font-bold text-lg tracking-tight">OperaFlow</span>
        </Link>

        <Card className="p-6 md:p-8" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <h1 className="text-xl font-bold text-center mb-1">Painel Administrativo</h1>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Acesso restrito a administradores.
          </p>

          {bootstrap && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-2 font-medium text-primary mb-1">
                <Info className="h-3.5 w-3.5" /> Conta padrão criada
              </div>
              <div>E-mail: <span className="font-mono">{bootstrap.email}</span></div>
              <div>Senha: <span className="font-mono">{bootstrap.password}</span></div>
              <div className="mt-1 text-muted-foreground">Altere a senha após o primeiro acesso.</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="le">E-mail</Label>
              <Input id="le" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lp">Senha</Label>
              <Input id="lp" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Novas contas só podem ser criadas por um administrador, dentro do painel.
          </p>
        </Card>

        <Link to="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          ← Voltar para abertura de chamado
        </Link>
      </div>
    </div>
  );
}
