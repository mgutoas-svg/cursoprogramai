import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DEFAULT_ADMIN_EMAIL = "admin@operaflow.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@2026";

// Bootstrap (cria admin padrão se ainda não existe). Sem auth — idempotente.
export const bootstrapDefaultAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Já existe algum admin?
  const { data: existing, error: rolesErr } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1);
  if (rolesErr) throw new Error(rolesErr.message);
  if (existing && existing.length > 0) {
    return { created: false, email: DEFAULT_ADMIN_EMAIL };
  }

  // Procura usuário pelo email (paginado)
  async function findByEmail(): Promise<string | undefined> {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const hit = data.users.find((u) => u.email === DEFAULT_ADMIN_EMAIL);
      if (hit) return hit.id;
      if (data.users.length < 200) return undefined;
    }
    return undefined;
  }

  let userId = await findByEmail();

  if (!userId) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (createErr) {
      // Pode ter sido criado entre o list e o create — tenta achar novamente
      userId = await findByEmail();
      if (!userId) throw new Error(createErr.message);
    } else {
      userId = created.user!.id;
    }
  }

  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role: "admin" });
  if (roleErr && !roleErr.message.includes("duplicate")) throw new Error(roleErr.message);

  return { created: true, email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD };
});

// Confirma se o usuário autenticado é admin
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

// Lista usuários (admins)
export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    return list.users
      .filter((u) => adminIds.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));
  });

// Cria novo admin
export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(6).max(128),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user!.id, role: "admin" });
    if (roleErr) throw new Error(roleErr.message);
    return { id: created.user!.id, email: created.user!.email };
  });

// Remove admin
export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir a própria conta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
