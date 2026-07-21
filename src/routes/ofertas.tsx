import { createFileRoute, redirect } from "@tanstack/react-router";

// A biblioteca completa vive no Dashboard (/). "Ofertas" é apenas um alias
// no sidebar — redireciona pra evitar UX confusa de dupla listagem.
export const Route = createFileRoute("/ofertas")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
