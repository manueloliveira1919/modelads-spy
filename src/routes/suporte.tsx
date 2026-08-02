import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, LifeBuoy, Paperclip, Plus, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { SupportAttachment } from "@/components/support-attachment";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  formatDateTime,
  uploadAttachment,
  validateImage,
  type SupportMessage,
  type SupportTicket,
} from "@/lib/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — Modelads" },
      {
        name: "description",
        content:
          "Abra um chamado de suporte do Modelads e acompanhe as respostas da nossa equipe.",
      },
      { property: "og:title", content: "Suporte — Modelads" },
      {
        property: "og:description",
        content: "Central de chamados do Modelads: abra, acompanhe e responda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SupportPage />
    </RequireAuth>
  ),
});

const ticketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Descreva o assunto em pelo menos 3 caracteres")
    .max(120, "Assunto muito longo (máx. 120 caracteres)"),
  message: z
    .string()
    .trim()
    .min(10, "Conte um pouco mais sobre o problema (mín. 10 caracteres)")
    .max(4000, "Mensagem muito longa (máx. 4000 caracteres)"),
});

function SupportPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ["support", "my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });

  const selected = useMemo(
    () => ticketsQuery.data?.find((t) => t.id === selectedId) ?? null,
    [ticketsQuery.data, selectedId],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              <span className="text-gradient-brand">Suporte</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Abra um chamado e acompanhe as respostas da nossa equipe.
            </p>
          </div>
          <Button onClick={() => setOpenForm(true)} className="w-fit gap-2">
            <Plus className="h-4 w-4" /> Abrir chamado
          </Button>
        </div>

        {selected ? (
          <TicketThread
            ticket={selected}
            onBack={() => setSelectedId(null)}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ["support", "my-tickets"] });
            }}
          />
        ) : ticketsQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card/50" />
        ) : (ticketsQuery.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <LifeBuoy className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">
              Nenhum chamado ainda
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Se algo não estiver funcionando, abra um chamado que a gente responde por aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ticketsQuery.data!.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left transition hover:border-brand/40 hover:bg-accent/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{t.subject}</span>
                  <Badge className={STATUS_CLASS[t.status] ?? STATUS_CLASS['open']!}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {t.message}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Última atividade: {formatDateTime(t.last_message_at)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <NewTicketDialog
        open={openForm}
        onOpenChange={setOpenForm}
        onCreated={(id) => {
          qc.invalidateQueries({ queryKey: ["support", "my-tickets"] });
          setSelectedId(id);
        }}
      />
    </AppShell>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const createMut = useMutation({
    mutationFn: async () => {
      const parsed = ticketSchema.safeParse({ subject, message });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      }
      if (file) {
        const err = validateImage(file);
        if (err) throw new Error(err);
      }
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          name:
            (user.user_metadata?.['display_name'] as string | undefined) ??
            user.email ??
            "Cliente",
          email: user.email ?? "",
          subject: parsed.data.subject,
          message: parsed.data.message,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (file) {
        const path = await uploadAttachment(file, user.id, data.id);
        await supabase
          .from("support_tickets")
          .update({ attachment_path: path })
          .eq("id", data.id);
      }
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Chamado aberto! Responderemos por aqui.");
      setSubject("");
      setMessage("");
      setFile(null);
      onOpenChange(false);
      onCreated(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir chamado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              maxLength={120}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex.: Não consigo baixar o criativo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              maxLength={4000}
              rows={5}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva o que aconteceu, com o máximo de detalhes."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file">Anexar imagem (opcional)</Label>
            <Input
              id="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">PNG, JPG ou WebP até 5 MB.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            {createMut.isPending ? "Enviando…" : "Enviar chamado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketThread({
  ticket,
  onBack,
  onChanged,
}: {
  ticket: SupportTicket;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const messagesQuery = useQuery({
    queryKey: ["support", "messages", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as SupportMessage[];
    },
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (text.length < 2) throw new Error("Escreva sua mensagem.");
      if (text.length > 4000) throw new Error("Mensagem muito longa (máx. 4000).");
      if (!user) throw new Error("Sessão expirada. Entre novamente.");
      let path: string | null = null;
      if (file) {
        const err = validateImage(file);
        if (err) throw new Error(err);
        path = await uploadAttachment(file, user.id, ticket.id);
      }
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        author_id: user.id,
        is_admin: false,
        body: text,
        attachment_path: path,
      });
      if (error) throw error;
      await supabase
        .from("support_tickets")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", ticket.id);
    },
    onSuccess: () => {
      setBody("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["support", "messages", ticket.id] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopenMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "open", last_message_at: new Date().toISOString() })
        .eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chamado reaberto.");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolved = ticket.status === "resolved";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos chamados
      </button>

      <Card className="border-border/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">{ticket.subject}</h2>
          <Badge className={STATUS_CLASS[ticket.status] ?? STATUS_CLASS['open']!}>
            {STATUS_LABEL[ticket.status] ?? ticket.status}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Aberto em {formatDateTime(ticket.created_at)}
        </p>

        <div className="mt-5 space-y-4">
          <Bubble
            author="Você"
            date={ticket.created_at}
            body={ticket.message ?? ""}
            attachment={ticket.attachment_path}
          />
          {(messagesQuery.data ?? []).map((m) => (
            <Bubble
              key={m.id}
              author={m.is_admin ? "Suporte Modelads" : "Você"}
              admin={m.is_admin}
              date={m.created_at}
              body={m.body}
              attachment={m.attachment_path}
            />
          ))}
        </div>
      </Card>

      {resolved ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Este chamado foi marcado como resolvido.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => reopenMut.mutate()}
            disabled={reopenMut.isPending}
          >
            Reabrir chamado
          </Button>
        </div>
      ) : (
        <Card className="space-y-3 border-border/60 p-5">
          <Label htmlFor="reply">Responder</Label>
          <Textarea
            id="reply"
            rows={4}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva sua mensagem…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="max-w-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" /> {file.name}
              </span>
            )}
            <Button
              className="ml-auto gap-2"
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending}
            >
              <Send className="h-4 w-4" />
              {sendMut.isPending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Bubble({
  author,
  admin,
  date,
  body,
  attachment,
}: {
  author: string;
  admin?: boolean;
  date: string;
  body: string;
  attachment: string | null;
}) {
  return (
    <div
      className={
        admin
          ? "rounded-xl border border-brand/30 bg-brand/5 p-4"
          : "rounded-xl border border-border bg-background/40 p-4"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className={admin ? "text-sm font-semibold text-brand" : "text-sm font-semibold"}>
          {author}
        </span>
        <span className="text-xs text-muted-foreground">{formatDateTime(date)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{body}</p>
      <SupportAttachment path={attachment} />
    </div>
  );
}
