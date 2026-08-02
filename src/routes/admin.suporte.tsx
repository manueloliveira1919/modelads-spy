import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Search, Send } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-shell";
import { SupportAttachment } from "@/components/support-attachment";
import { supabase } from "@/integrations/supabase/client";
import { logSystem } from "@/lib/admin-log";
import { useAuth } from "@/lib/auth-context";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  formatDateTime,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/suporte")({
  component: SuportePage,
});

const STATUSES = ["open", "in_progress", "resolved"] as const;

function SuportePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });

  const tickets = ticketsQuery.data ?? [];

  const counts = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [tickets],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (statusFilter === "all" || t.status === statusFilter) &&
        (!term ||
          t.subject.toLowerCase().includes(term) ||
          t.email.toLowerCase().includes(term) ||
          t.name.toLowerCase().includes(term)),
    );
  }, [tickets, statusFilter, q]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  if (selected) {
    return (
      <TicketDetail ticket={selected} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Suporte"
        description="Chamados abertos pelos usuários."
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <Card key={s} className="border-border/60 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {STATUS_LABEL[s]}
            </div>
            <div className="mt-1 text-2xl font-bold">{counts[s]}</div>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por assunto, nome ou e-mail"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Última atividade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!ticketsQuery.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Nenhum chamado encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(t.id)}
              >
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">{t.email}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>
                  <Badge className={STATUS_CLASS[t.status] ?? STATUS_CLASS['open']!}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(t.last_message_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function TicketDetail({
  ticket,
  onBack,
}: {
  ticket: SupportTicket;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [body, setBody] = useState("");

  const messagesQuery = useQuery({
    queryKey: ["admin", "ticket-messages", ticket.id],
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

  const replyMut = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (text.length < 2) throw new Error("Escreva a resposta.");
      if (text.length > 4000) throw new Error("Resposta muito longa (máx. 4000).");
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        author_id: user?.id ?? null,
        is_admin: true,
        body: text,
      });
      if (error) throw error;
      const { error: upErr } = await supabase
        .from("support_tickets")
        .update({
          last_message_at: new Date().toISOString(),
          status: ticket.status === "open" ? "in_progress" : ticket.status,
        })
        .eq("id", ticket.id);
      if (upErr) throw upErr;
      await logSystem({
        action: "support.reply",
        metadata: { ticket_id: ticket.id },
      });
    },
    onSuccess: () => {
      setBody("");
      toast.success("Resposta enviada.");
      qc.invalidateQueries({ queryKey: ["admin", "ticket-messages", ticket.id] });
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticket.id);
      if (error) throw error;
      await logSystem({
        action: "support.status",
        metadata: { ticket_id: ticket.id, status },
      });
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à lista
      </button>

      <AdminPageHeader
        title={ticket.subject}
        description={`${ticket.name} · ${ticket.email} · aberto em ${formatDateTime(ticket.created_at)}`}
        actions={
          <Select
            value={ticket.status}
            onValueChange={(v) => statusMut.mutate(v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card className="space-y-4 border-border/60 p-5">
        <Bubble
          author={ticket.name}
          date={ticket.created_at}
          body={ticket.message ?? ""}
          attachment={ticket.attachment_path}
        />
        {(messagesQuery.data ?? []).map((m) => (
          <Bubble
            key={m.id}
            author={m.is_admin ? "Suporte Modelads" : ticket.name}
            admin={m.is_admin}
            date={m.created_at}
            body={m.body}
            attachment={m.attachment_path}
          />
        ))}
      </Card>

      <Card className="mt-4 space-y-3 border-border/60 p-5">
        <Label htmlFor="admin-reply">Responder ao cliente</Label>
        <Textarea
          id="admin-reply"
          rows={4}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escreva a resposta…"
        />
        <Button
          className="w-fit gap-2"
          onClick={() => replyMut.mutate()}
          disabled={replyMut.isPending}
        >
          <Send className="h-4 w-4" />
          {replyMut.isPending ? "Enviando…" : "Enviar resposta"}
        </Button>
      </Card>
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
