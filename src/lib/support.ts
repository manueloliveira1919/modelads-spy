import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_BUCKET = "support-attachments";

export type TicketStatus = "open" | "in_progress" | "resolved";

export type SupportTicket = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string | null;
  status: string;
  attachment_path: string | null;
  last_message_at: string;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  is_admin: boolean;
  body: string;
  attachment_path: string | null;
  created_at: string;
};

export const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
};

export const STATUS_CLASS: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-400 hover:bg-amber-500/20",
  in_progress: "bg-sky-500/15 text-sky-400 hover:bg-sky-500/20",
  resolved: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20",
};

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Envie PNG, JPG ou WebP.";
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return "Imagem muito grande. O limite é 5 MB.";
  }
  return null;
}

/** Faz upload em {user_id}/{ticket_id}/{arquivo} e devolve o caminho salvo. */
export async function uploadAttachment(
  file: File,
  userId: string,
  ticketId: string,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${userId}/${ticketId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(SUPPORT_BUCKET)
    .createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
