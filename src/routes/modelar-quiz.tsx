import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/modelar-quiz")({
  component: () => <Outlet />,
});
