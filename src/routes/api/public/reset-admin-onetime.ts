import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/reset-admin-onetime")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const { email, password, token } = body as { email?: string; password?: string; token?: string };
        if (token !== "onetime-reset-2026") {
          return new Response("forbidden", { status: 403 });
        }
        if (!email || !password) {
          return new Response("missing", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find existing admin role row
        const { data: roles, error: rolesErr } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (rolesErr) return new Response(rolesErr.message, { status: 500 });

        let userId: string | undefined = roles?.[0]?.user_id;

        // Also check if a user with this target email already exists
        let existingByEmail: string | undefined;
        for (let page = 1; page <= 20; page++) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (error) return new Response(error.message, { status: 500 });
          const hit = data.users.find((u) => u.email === email);
          if (hit) { existingByEmail = hit.id; break; }
          if (data.users.length < 200) break;
        }

        if (existingByEmail) {
          userId = existingByEmail;
          const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password,
            email_confirm: true,
          });
          if (error) return new Response(error.message, { status: 500 });
        } else if (userId) {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email,
            password,
            email_confirm: true,
          });
          if (error) return new Response(error.message, { status: 500 });
        } else {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (error) return new Response(error.message, { status: 500 });
          userId = created.user!.id;
        }

        // Ensure admin role
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId!, role: "admin" }, { onConflict: "user_id,role" });
        if (roleErr) return new Response(roleErr.message, { status: 500 });

        return Response.json({ ok: true, userId, email });
      },
    },
  },
});
