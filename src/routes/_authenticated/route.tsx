import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Truck, Wrench as WrenchIcon, DollarSign, LogOut, Menu, X, Wrench, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Exige papel de admin
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin/chamados", label: "Chamados", icon: Bell },
  { to: "/admin/frota", label: "Frota & Documentos", icon: Truck },
  { to: "/admin/manutencao", label: "Manutenção", icon: WrenchIcon },
  { to: "/admin/custos", label: "Custos", icon: DollarSign },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
] as const;

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground"
               style={{ background: "var(--gradient-primary)" }}>
            <Wrench className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight">OperaFlow</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-sidebar-accent/60 transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/70 truncate">{user.email}</div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-primary-foreground"
               style={{ background: "var(--gradient-primary)" }}>
            <Wrench className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold tracking-tight text-sm">OperaFlow</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-sidebar text-sidebar-foreground pt-14">
          <nav className="p-4 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium hover:bg-sidebar-accent/60"
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
            <Button variant="ghost" className="w-full justify-start mt-4 text-sidebar-foreground hover:bg-sidebar-accent" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </nav>
        </div>
      )}

      <main className={cn("flex-1 min-w-0", "pt-14 md:pt-0")}>
        <Outlet />
      </main>
    </div>
  );
}
