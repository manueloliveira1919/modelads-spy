import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Modelads" },
      { name: "description", content: "Painel administrativo do Modelads." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RequireAuth role="admin">
      <AdminShell>
        <Outlet />
      </AdminShell>
    </RequireAuth>
  );
}
