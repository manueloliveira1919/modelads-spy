// Fase 3 — leitura dos leads pelo dono do quiz (RLS garante a propriedade).
import { supabase } from "@/integrations/supabase/client";

export interface QuizLead {
  id: string;
  quiz_id: string;
  session_id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  created_at: string;
}

export async function listQuizLeads(quizId: string): Promise<QuizLead[]> {
  const { data, error } = await (supabase as any)
    .from("quiz_leads")
    .select("id, quiz_id, session_id, name, email, whatsapp, created_at")
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuizLead[];
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function leadsToCsv(leads: QuizLead[]): string {
  const header = ["Nome", "E-mail", "WhatsApp", "Data"];
  const rows = leads.map((l) => [
    l.name ?? "",
    l.email ?? "",
    l.whatsapp ?? "",
    new Date(l.created_at).toLocaleString("pt-BR"),
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export function downloadLeadsCsv(leads: QuizLead[], fileName: string) {
  // BOM para o Excel abrir acentuação em UTF-8 corretamente.
  const blob = new Blob(["\uFEFF" + leadsToCsv(leads)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
